"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { addTicketCommentAction } from "@/app/(app)/tickets/actions";
import type { TicketCommentFormState } from "@/lib/validation/ticket";

const initialState: TicketCommentFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" loading={pending}>
      <MessageSquarePlus className="size-3.5" /> Add comment
    </Button>
  );
}

export function TicketCommentForm({ ticketId }: { ticketId: string }) {
  const action = addTicketCommentAction.bind(null, ticketId);
  const [state, formAction] = useActionState(action, initialState);
  const [isInternal, setIsInternal] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2 rounded-md border border-border p-3" noValidate>
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
      <textarea
        name="comment"
        rows={2}
        placeholder="Add an internal note or a message to the customer..."
        className="w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {state.fieldErrors?.comment && <p className="text-xs text-destructive">{state.fieldErrors.comment[0]}</p>}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="hidden" name="isInternal" value={isInternal ? "true" : "false"} />
          <Checkbox checked={isInternal} onCheckedChange={(v) => setIsInternal(v === true)} />
          <Label className="cursor-pointer font-normal">Internal note (not visible to customer)</Label>
        </label>
        <SubmitButton />
      </div>
    </form>
  );
}
