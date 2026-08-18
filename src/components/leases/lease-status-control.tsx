"use client";

import { useState, useTransition } from "react";
import type { LeaseStatus } from "@prisma/client";
import { ArrowRightCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/status-badge";
import { updateLeaseStatusAction } from "@/app/(app)/leases/actions";
import { LEASE_STATUSES } from "@/lib/validation/lease";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  EXPIRED: "Expired",
  TERMINATED: "Terminated",
  PENDING_RENEWAL: "Pending Renewal",
};

export function LeaseStatusControl({ leaseId, currentStatus }: { leaseId: string; currentStatus: LeaseStatus }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<LeaseStatus>(currentStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setStatus(currentStatus);
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
          <DialogTitle>Update lease status</DialogTitle>
          <DialogDescription>Terminating or expiring a lease releases the unit back to vacant.</DialogDescription>
        </DialogHeader>

        {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

        <div className="space-y-1.5">
          <Label>Current status</Label>
          <StatusBadge status={currentStatus} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="new-status">New status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as LeaseStatus)}>
            <SelectTrigger id="new-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEASE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                const result = await updateLeaseStatusAction(leaseId, status);
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
