"use client";

import { useState, useTransition } from "react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { acceptTicketAction } from "@/app/(app)/tickets/actions";

const QUICK_ETAS = [
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "4 hours", minutes: 4 * 60 },
  { label: "Tomorrow, 9am", minutes: null },
] as const;

function tomorrowNineAm(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}

function toLocalInputValue(date: Date): string {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

/**
 * The explicit "Accept order" moment — staff confirm they're taking the
 * request and can tighten/loosen the response deadline the SLA already set
 * (see ticket.service.ts#acceptTicket), just like a restaurant confirming a
 * prep time on Glovo. Leaving the custom field untouched keeps the ticket's
 * existing SLA deadline; accepting never requires changing it.
 */
export function AcceptTicketDialog({ ticketId, currentUserId, dueAt }: { ticketId: string; currentUserId: string; dueAt: Date | null }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [customValue, setCustomValue] = useState(dueAt ? toLocalInputValue(dueAt) : "");

  function submit(dueAtOverride: Date | null) {
    startTransition(async () => {
      const result = await acceptTicketAction(ticketId, currentUserId, dueAtOverride ? dueAtOverride.toISOString() : null);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Inbox className="size-3.5" /> Receive ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Accept this request</DialogTitle>
          <DialogDescription>
            {dueAt
              ? `Currently due by ${dueAt.toLocaleString()}. Confirm as-is or set a new response deadline.`
              : "Confirm you're taking this request, optionally with a response deadline."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          {QUICK_ETAS.map((opt) => (
            <Button
              key={opt.label}
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => submit(opt.minutes !== null ? new Date(Date.now() + opt.minutes * 60_000) : tomorrowNineAm())}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="customDueAt">Custom date &amp; time</Label>
          <div className="flex gap-2">
            <Input id="customDueAt" type="datetime-local" value={customValue} onChange={(e) => setCustomValue(e.target.value)} className="flex-1" />
            <Button type="button" size="sm" variant="outline" disabled={isPending || !customValue} onClick={() => submit(new Date(customValue))}>
              Set
            </Button>
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button loading={isPending} onClick={() => submit(null)}>
            Accept {dueAt ? "as-is" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
