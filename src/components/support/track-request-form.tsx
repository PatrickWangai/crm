"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { SupportStageStepper } from "@/components/support/support-stage-stepper";
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

      {state.result && (
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{state.result.subject}</p>
              <p className="text-xs text-muted-foreground">{state.result.ticketNumber} &middot; {state.result.category}</p>
            </div>
            <StatusBadge status={state.result.priority} />
          </div>

          <div className="mt-4 mb-1">
            <SupportStageStepper stage={state.result.stage} activeLabel={state.result.stageLabel} />
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Submitted {new Date(state.result.createdAt).toLocaleString()}
            {state.result.resolvedAt && ` · Resolved ${new Date(state.result.resolvedAt).toLocaleString()}`}
          </p>

          {state.result.publicComments.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-border pt-3">
              <p className="text-xs font-medium text-muted-foreground">Updates</p>
              <ul className="space-y-2">
                {state.result.publicComments.map((c, i) => (
                  <li key={i} className="rounded-md bg-secondary/50 p-2.5 text-sm">
                    <p className="whitespace-pre-wrap">{c.comment}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
