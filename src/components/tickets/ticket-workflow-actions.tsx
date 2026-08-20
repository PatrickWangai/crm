"use client";

import { useState, useTransition } from "react";
import type { TicketStatus } from "@prisma/client";
import { PhoneCall, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateTicketStatusAction } from "@/app/(app)/tickets/actions";
import { AcceptTicketDialog } from "@/components/tickets/accept-ticket-dialog";

/**
 * Fast, guided path through the common lifecycle a department follows on an
 * incoming request: Receive it (self-assign + confirm an ETA, REQUEST_LOGGED
 * -> ASSIGNED, see accept-ticket-dialog.tsx) -> Contact the customer
 * (ASSIGNED -> IN_PROGRESS) -> Mark fulfilled (IN_PROGRESS -> COMPLETED).
 * Each stage change is what the customer sees reflected in their tracking
 * view (see lib/support-stage.ts). The generic TicketStatusControl dropdown
 * stays available alongside this for anything outside the common path
 * (reopening, closing, skipping ahead).
 */
export function TicketWorkflowActions({
  ticketId,
  status,
  currentUserId,
  dueAt,
  canAssign,
  canUpdate,
}: {
  ticketId: string;
  status: TicketStatus;
  currentUserId: string;
  dueAt: Date | null;
  canAssign: boolean;
  canUpdate: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const result = await action();
      setError(result.error ?? null);
    });
  }

  const showReceive = canAssign && status === "REQUEST_LOGGED";
  const showContact = canUpdate && status === "ASSIGNED";
  const showFulfil = canUpdate && status === "IN_PROGRESS";

  if (!showReceive && !showContact && !showFulfil) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center gap-2">
        {showReceive && <AcceptTicketDialog ticketId={ticketId} currentUserId={currentUserId} dueAt={dueAt} />}
        {showContact && (
          <Button size="sm" loading={isPending} onClick={() => run(() => updateTicketStatusAction(ticketId, "IN_PROGRESS"))}>
            <PhoneCall className="size-3.5" /> Contact customer
          </Button>
        )}
        {showFulfil && (
          <Button size="sm" loading={isPending} onClick={() => run(() => updateTicketStatusAction(ticketId, "COMPLETED"))}>
            <CheckCircle2 className="size-3.5" /> Mark fulfilled
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
