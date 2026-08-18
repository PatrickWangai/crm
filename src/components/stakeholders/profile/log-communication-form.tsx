"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { logCommunicationAction, type CommunicationFormState } from "@/app/(app)/stakeholders/actions";

const CHANNELS = ["CALL", "EMAIL", "SMS", "WHATSAPP", "MEETING", "NOTE", "WALK_IN"];
const CHANNEL_LABELS: Record<string, string> = {
  CALL: "Call",
  EMAIL: "Email",
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
  MEETING: "Meeting",
  NOTE: "Note",
  WALK_IN: "Walk-in",
};

const initialState: CommunicationFormState = {};

function nowForDatetimeLocal(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Log interaction
    </Button>
  );
}

export function LogCommunicationForm({ stakeholderId }: { stakeholderId: string }) {
  const [open, setOpen] = useState(false);
  const action = logCommunicationAction.bind(null, stakeholderId);
  const [state, formAction] = useActionState(action, initialState);
  const [channel, setChannel] = useState("CALL");
  const [direction, setDirection] = useState("OUTBOUND");
  const formRef = useRef<HTMLFormElement>(null);

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.success) setOpen(false);
  }

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <MessageSquarePlus /> Log interaction
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form ref={formRef} action={formAction} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>Log an interaction</DialogTitle>
            <DialogDescription>Record a call, email, meeting or other touchpoint with this stakeholder.</DialogDescription>
          </DialogHeader>

          {state.error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="channel">Channel</Label>
              <input type="hidden" name="channel" value={channel} />
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger id="channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CHANNEL_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="direction">Direction</Label>
              <input type="hidden" name="direction" value={direction} />
              <Select value={direction} onValueChange={setDirection}>
                <SelectTrigger id="direction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OUTBOUND">Outbound</SelectItem>
                  <SelectItem value="INBOUND">Inbound</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="occurredAt">Date &amp; time</Label>
            <Input id="occurredAt" name="occurredAt" type="datetime-local" defaultValue={nowForDatetimeLocal()} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" name="subject" placeholder="Optional summary" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="content">Details</Label>
            <textarea
              id="content"
              name="content"
              rows={4}
              required
              className="w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {state.fieldErrors?.content && <p className="text-xs text-destructive">{state.fieldErrors.content[0]}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
