"use client";

import { useState, useTransition } from "react";
import { Forward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { forwardTicketAction, forwardTicketToMemberAction } from "@/app/(app)/tickets/actions";
import type { Option } from "@/components/admin/users/user-form-sheet";

interface DepartmentOption {
  id: string;
  name: string;
  code: string;
}

type Target = "department" | "member";

/**
 * Hands a ticket off entirely — either to a different department's queue
 * (forwardTicketToDepartment) or straight to a named person, possibly in a
 * different department (forwardTicketToMember); see ticket.service.ts for
 * how the two differ (department-forward clears the assignee and resets to
 * Request Logged so the receiving department accepts it fresh;
 * member-forward assigns them directly and marks it Assigned, since
 * there's already a named owner). Distinct from AssignTicketSelect, which
 * only reassigns within the ticket's current department and skips all of
 * this — no department move, no reopen, no forwarded-by note.
 */
export function ForwardTicketDialog({
  ticketId,
  currentDepartmentId,
  currentAssigneeId,
  departments,
  staff,
}: {
  ticketId: string;
  currentDepartmentId: string | null;
  currentAssigneeId: string | null;
  departments: DepartmentOption[];
  staff: Option[];
}) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Target>("department");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState("");
  const [memberId, setMemberId] = useState("");
  const [note, setNote] = useState("");

  const departmentOptions = departments.filter((d) => d.id !== currentDepartmentId);
  const memberOptions = staff.filter((s) => s.id !== currentAssigneeId);

  function reset() {
    setDepartmentId("");
    setMemberId("");
    setNote("");
  }

  function submit() {
    const trimmedNote = note.trim() || null;
    if (target === "department") {
      if (!departmentId) return;
      startTransition(async () => {
        const result = await forwardTicketAction(ticketId, departmentId, trimmedNote);
        if (result.error) {
          setError(result.error);
          return;
        }
        setOpen(false);
        reset();
      });
    } else {
      if (!memberId) return;
      startTransition(async () => {
        const result = await forwardTicketToMemberAction(ticketId, memberId, trimmedNote);
        if (result.error) {
          setError(result.error);
          return;
        }
        setOpen(false);
        reset();
      });
    }
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
          <Forward className="size-3.5" /> Forward
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Forward this ticket</DialogTitle>
          <DialogDescription>
            {target === "department"
              ? "Hands this request off entirely — it'll be unassigned and, unless already completed, reset to Request Logged so the receiving department accepts it fresh."
              : "Assigns this request directly to them — unless already completed, it moves to their department and is marked Assigned right away."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={target} onValueChange={(v) => setTarget(v as Target)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="department">Department</TabsTrigger>
            <TabsTrigger value="member">Team member</TabsTrigger>
          </TabsList>
        </Tabs>

        {target === "department" ? (
          <div className="space-y-1.5">
            <Label htmlFor="forwardDepartment">Department</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger id="forwardDepartment" className="w-full">
                <SelectValue placeholder="Choose a department" />
              </SelectTrigger>
              <SelectContent>
                {departmentOptions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="forwardMember">Team member</Label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger id="forwardMember" className="w-full">
                <SelectValue placeholder="Choose a team member" />
              </SelectTrigger>
              <SelectContent>
                {memberOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

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
          <Button loading={isPending} disabled={target === "department" ? !departmentId : !memberId} onClick={submit}>
            Forward
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
