"use client";

import { useState, useTransition } from "react";
import type { LeadStatus } from "@prisma/client";
import { ArrowRightCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/status-badge";
import { updateLeadStatusAction } from "@/app/(app)/leads/actions";

const STATUSES: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "NEGOTIATION", "VIEWING_SCHEDULED", "RESERVATION", "CLOSED_WON", "CLOSED_LOST"];
const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  NEGOTIATION: "Negotiation",
  VIEWING_SCHEDULED: "Viewing Scheduled",
  RESERVATION: "Reservation",
  CLOSED_WON: "Closed Won",
  CLOSED_LOST: "Closed Lost",
};

export function LeadStatusControl({ leadId, currentStatus }: { leadId: string; currentStatus: LeadStatus }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<LeadStatus>(currentStatus);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setStatus(currentStatus);
          setNote("");
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <ArrowRightCircle className="size-3.5" /> Change status
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Move this lead</DialogTitle>
          <DialogDescription>Update the pipeline stage. This is recorded in the lead&apos;s history.</DialogDescription>
        </DialogHeader>

        {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

        <div className="space-y-1.5">
          <Label>Current status</Label>
          <StatusBadge status={currentStatus} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="new-status">New status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as LeadStatus)}>
            <SelectTrigger id="new-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="status-note">Note (optional)</Label>
          <textarea
            id="status-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            loading={isPending}
            disabled={status === currentStatus}
            onClick={() =>
              startTransition(async () => {
                const result = await updateLeadStatusAction(leadId, status, note);
                if (result.error) setError(result.error);
                else setOpen(false);
              })
            }
          >
            Update status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
