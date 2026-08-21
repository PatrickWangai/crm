"use client";

import { useState, useTransition } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { nudgeTicketAction } from "@/app/(app)/tickets/actions";

/** A manual "push" for one specific ticket — separate from the periodic Check SLA risk scan, for when someone's already looking at a ticket and wants to escalate it right now. */
export function NudgeTicketButton({ ticketId }: { ticketId: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        loading={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await nudgeTicketAction(ticketId);
            setMessage(result.error ?? (result.notified ? `Reminder sent.` : "Nothing to nudge — no assignee or department on this ticket."));
          })
        }
      >
        <BellRing className="size-3.5" /> Nudge
      </Button>
      {message && <span className="text-xs text-muted-foreground">{message}</span>}
    </div>
  );
}
