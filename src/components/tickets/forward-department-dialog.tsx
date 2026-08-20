"use client";

import { useState, useTransition } from "react";
import { Forward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { forwardTicketAction } from "@/app/(app)/tickets/actions";

interface DepartmentOption {
  id: string;
  name: string;
  code: string;
}

/**
 * Hands a ticket to a different department entirely (see
 * forwardTicketToDepartment in ticket.service.ts) — distinct from
 * AssignTicketSelect, which only reassigns within the ticket's current
 * department. Excludes the ticket's current department from the picker
 * since forwarding to where it already is isn't a meaningful action.
 */
export function ForwardDepartmentDialog({
  ticketId,
  currentDepartmentId,
  departments,
}: {
  ticketId: string;
  currentDepartmentId: string | null;
  departments: DepartmentOption[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState("");
  const [note, setNote] = useState("");

  const options = departments.filter((d) => d.id !== currentDepartmentId);

  function submit() {
    if (!departmentId) return;
    startTransition(async () => {
      const result = await forwardTicketAction(ticketId, departmentId, note.trim() || null);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setDepartmentId("");
      setNote("");
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Forward className="size-3.5" /> Forward to dept
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Forward to another department</DialogTitle>
          <DialogDescription>
            Hands this request off entirely — it&apos;ll be unassigned and, unless already completed, reset to Request Logged so the receiving
            department accepts it fresh.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="forwardDepartment">Department</Label>
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger id="forwardDepartment" className="w-full">
              <SelectValue placeholder="Choose a department" />
            </SelectTrigger>
            <SelectContent>
              {options.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="forwardNote">Note (optional)</Label>
          <textarea
            id="forwardNote"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why this belongs with them"
            className="w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button loading={isPending} disabled={!departmentId} onClick={submit}>
            Forward
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
