"use client";

import { useActionState, useState, useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  initiateTransferAction,
  cancelTransferAction,
  respondToTransferAction,
  revertTransferAction,
  type SimpleActionState,
} from "@/app/(app)/profile/actions";

interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  role: { name: string };
}

interface OutgoingTransfer {
  id: string;
  status: string;
  createdAt: Date;
  promotesRole: boolean;
  durationDays: number | null;
  expiresAt: Date | null;
  revertedAt: Date | null;
  toUser: { firstName: string; lastName: string };
}

interface IncomingTransfer {
  id: string;
  createdAt: Date;
  promotesRole: boolean;
  durationDays: number | null;
  fromUser: { firstName: string; lastName: string; role: { name: string } };
  department: { name: string };
}

interface ActiveTemporaryHandoff {
  id: string;
  durationDays: number | null;
  expiresAt: Date | null;
  fromUserId: string;
  toUserId: string;
  fromUser: { firstName: string; lastName: string };
  toUser: { firstName: string; lastName: string };
}

/** Radix Select needs a non-empty value for every item — stands in for durationDays=null ("forever"). */
const FOREVER = "__forever__";
const DURATION_OPTIONS = [
  { value: "7", label: "1 week" },
  { value: "14", label: "2 weeks" },
  { value: "30", label: "1 month" },
  { value: "90", label: "3 months" },
];

function daysLeft(expiresAt: Date): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

const initialState: SimpleActionState = {};

export function TransferSection({
  currentUserId,
  candidates,
  outgoing,
  incoming,
  activeTemporary,
}: {
  currentUserId: string;
  candidates: Candidate[];
  outgoing: OutgoingTransfer[];
  incoming: IncomingTransfer[];
  activeTemporary: ActiveTemporaryHandoff[];
}) {
  const [successorId, setSuccessorId] = useState("");
  const [duration, setDuration] = useState(FOREVER);
  const [state, formAction, pending] = useActionState(initiateTransferAction, initialState);
  const [isPending, startTransition] = useTransition();
  const [respondMessage, setRespondMessage] = useState<string | null>(null);
  const [endMessage, setEndMessage] = useState<string | null>(null);

  const hasPendingOutgoing = outgoing.some((t) => t.status === "PENDING");

  return (
    <div className="space-y-4">
      {incoming.length > 0 && (
        <div className="space-y-2 rounded-md border border-warning/30 bg-warning-muted/30 p-3">
          <p className="text-sm font-medium">Pending hand-off requests to you</p>
          {incoming.map((req) => (
            <div key={req.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                <strong>
                  {req.fromUser.firstName} {req.fromUser.lastName}
                </strong>{" "}
                ({req.fromUser.role.name}) wants to hand off to you
                {req.promotesRole ? " — including their role" : ""}
                {req.durationDays ? ` for ${req.durationDays} day${req.durationDays === 1 ? "" : "s"}` : " — permanently"}.
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await respondToTransferAction(req.id, true);
                      setRespondMessage(res.error ?? "Accepted — everything has moved over to you.");
                    })
                  }
                >
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await respondToTransferAction(req.id, false);
                      setRespondMessage(res.error ?? "Declined.");
                    })
                  }
                >
                  Decline
                </Button>
              </div>
            </div>
          ))}
          {respondMessage && <p className="text-xs text-muted-foreground">{respondMessage}</p>}
        </div>
      )}

      {activeTemporary.length > 0 && (
        <div className="space-y-2 rounded-md border border-info/30 bg-info-muted/30 p-3">
          <p className="text-sm font-medium">Active temporary hand-offs</p>
          {activeTemporary.map((t) => {
            const isOutgoing = t.fromUserId === currentUserId;
            return (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  {isOutgoing ? (
                    <>
                      Handed off to <strong>{t.toUser.firstName} {t.toUser.lastName}</strong>
                    </>
                  ) : (
                    <>
                      Covering for <strong>{t.fromUser.firstName} {t.fromUser.lastName}</strong>
                    </>
                  )}
                  {t.expiresAt && <> — reverts in {daysLeft(t.expiresAt)} day{daysLeft(t.expiresAt) === 1 ? "" : "s"}</>}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await revertTransferAction(t.id);
                      setEndMessage(res.error ?? "Ended — everything still with the temporary owner has moved back.");
                    })
                  }
                >
                  End now
                </Button>
              </div>
            );
          })}
          {endMessage && <p className="text-xs text-muted-foreground">{endMessage}</p>}
        </div>
      )}

      {outgoing.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Your hand-off requests</p>
          {outgoing.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-2 text-sm">
              <span>
                To {t.toUser.firstName} {t.toUser.lastName}
                {t.status === "ACCEPTED" && t.durationDays && !t.revertedAt && " (temporary)"}
                {t.status === "ACCEPTED" && t.revertedAt && " (ended)"}
              </span>
              <div className="flex items-center gap-2">
                <Badge variant={t.status === "ACCEPTED" ? "success" : t.status === "PENDING" ? "info" : "outline"}>
                  {t.revertedAt ? "REVERTED" : t.status}
                </Badge>
                {t.status === "PENDING" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await cancelTransferAction(t.id);
                      })
                    }
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!hasPendingOutgoing && (
        <form action={formAction} className="space-y-2">
          <input type="hidden" name="toUserId" value={successorId} />
          <input type="hidden" name="durationDays" value={duration === FOREVER ? "" : duration} />
          <p className="text-xs text-muted-foreground">
            Pick a successor — they&apos;ll need to accept before anything moves. Choose &quot;Forever&quot; if you&apos;re leaving (you can deactivate
            your own account below once accepted), or a time period if you just need cover — it hands back automatically, or you can end it early.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={successorId} onValueChange={setSuccessorId}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder={candidates.length === 0 ? "No teammates to hand off to" : "Choose a successor"} />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} — {c.role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FOREVER}>Forever</SelectItem>
                {DURATION_OPTIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" disabled={pending || !successorId || candidates.length === 0}>
              {pending ? "Sending..." : "Request hand-off"}
            </Button>
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state.success && <p className="text-sm text-success">Request sent — waiting for them to accept.</p>}
        </form>
      )}
    </div>
  );
}
