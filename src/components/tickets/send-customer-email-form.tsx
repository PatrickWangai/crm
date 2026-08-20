"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SendCustomerEmailFormState } from "@/lib/validation/communication";

const initialState: SendCustomerEmailFormState = {};

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      <Mail className="size-3.5" /> Send email
    </Button>
  );
}

type SendEmailAction = (prevState: SendCustomerEmailFormState, formData: FormData) => Promise<SendCustomerEmailFormState>;

/** Actually sends an email to the customer's own submitted address — not a log entry, a real send via Resend. Recorded automatically as an outbound Communication once it goes out. */
export function SendCustomerEmailForm({ action, customerEmail }: { action: SendEmailAction; customerEmail: string | null }) {
  const [state, formAction] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Pure DOM side effect (clearing the compose fields) — the "sent" message
  // itself is derived straight from state.success below, no extra state needed.
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  if (!customerEmail) {
    return <p className="text-sm text-muted-foreground">No email on file for this customer — use the phone number instead.</p>;
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
      {state.success && (
        <p className="flex items-center gap-1.5 text-xs text-success">
          <CheckCircle2 className="size-3.5" /> Sent to {customerEmail}
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="emailSubject">Subject</Label>
        <Input id="emailSubject" name="subject" aria-invalid={!!state.fieldErrors?.subject} />
        {state.fieldErrors?.subject && <p className="text-xs text-destructive">{state.fieldErrors.subject[0]}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="emailBody">Message</Label>
        <textarea
          id="emailBody"
          name="body"
          rows={5}
          placeholder={`To: ${customerEmail}`}
          className="w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-invalid={!!state.fieldErrors?.body}
        />
        {state.fieldErrors?.body && <p className="text-xs text-destructive">{state.fieldErrors.body[0]}</p>}
      </div>
      <SendButton />
    </form>
  );
}
