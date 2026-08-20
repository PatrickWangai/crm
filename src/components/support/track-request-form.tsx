"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TrackingResultCard } from "@/components/support/tracking-result-card";
import { trackPublicSupportRequestAction } from "@/app/help/actions";
import type { TrackRequestFormState } from "@/lib/validation/public-support";

const initialState: TrackRequestFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} className="w-full sm:w-auto">
      Look up request
    </Button>
  );
}

export function TrackRequestForm() {
  const [state, formAction] = useActionState(trackPublicSupportRequestAction, initialState);

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4" noValidate>
        {state.error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ticketNumber">Reference number</Label>
            <Input id="ticketNumber" name="ticketNumber" placeholder="TKT-000123" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trackEmail">Email used when submitting</Label>
            <Input id="trackEmail" name="email" type="email" placeholder="you@example.com" />
          </div>
        </div>
        <SubmitButton />
      </form>

      {state.result && <TrackingResultCard result={state.result} />}
    </div>
  );
}
