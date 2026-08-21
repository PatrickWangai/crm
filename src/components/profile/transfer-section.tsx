"use client";

import { useActionState, useState, useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  initiateTransferAction,
  cancelTransferAction,
  respondToTransferAction,
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
  toUser: { firstName: string; lastName: string };
}

interface IncomingTransfer {
  id: string;
  createdAt: Date;
  promotesRole: boolean;
  fromUser: { firstName: string; lastName: string; role: { name: string } };
  department: { name: string };
}

const initialState: SimpleActionState = {};

export function TransferSection({
  candidates,
  outgoing,
  incoming,
}: {
  candidates: Candidate[];
  outgoing: OutgoingTransfer[];
  incoming: IncomingTransfer[];
}) {
  const [successorId, setSuccessorId] = useState("");
  const [state, formAction, pending] = useActionState(initiateTransferAction, initialState);
  const [isPending, startTransition] = useTransition();
  const [respondMessage, setRespondMessage] = useState<string | null>(null);

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
                ({req.fromUser.role.name}) wants to hand off to you{req.promotesRole ? " — including their role" : ""}.
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

      {outgoing.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Your hand-off requests</p>
          {outgoing.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-2 text-sm">
              <span>
                To {t.toUser.firstName} {t.toUser.lastName}
              </span>
              <div className="flex items-center gap-2">
                <Badge variant={t.status === "ACCEPTED" ? "success" : t.status === "PENDING" ? "info" : "outline"}>{t.status}</Badge>
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
          <p className="text-xs text-muted-foreground">
            Pick a successor — they&apos;ll need to accept before anything moves. Once accepted, you can deactivate your own account below.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={successorId} onValueChange={setSuccessorId}>
              <SelectTrigger className="w-64">
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
