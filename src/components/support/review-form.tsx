"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StarRatingInput } from "@/components/support/star-rating";
import { submitReviewAction } from "@/app/help/actions";
import type { SubmitReviewFormState } from "@/lib/validation/public-support";

const initialState: SubmitReviewFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} className="w-full sm:w-auto">
      Submit review
    </Button>
  );
}

export function ReviewForm({ ticketNumber, email, subject }: { ticketNumber: string; email: string; subject: string }) {
  const [state, formAction] = useActionState(submitReviewAction, initialState);

  if (state.success) {
    return (
      <div className="rounded-lg border border-success/30 bg-success-muted/40 p-6 text-center">
        <CheckCircle2 className="mx-auto size-10 text-success" />
        <h3 className="mt-3 text-lg font-semibold">Thank you for your feedback</h3>
        <p className="mt-1 text-sm text-muted-foreground">It&apos;s been shared with our leadership team.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="ticketNumber" value={ticketNumber} />
      <input type="hidden" name="email" value={email} />

      {state.error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>}

      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{subject}</p>
      </div>

      <div className="space-y-1.5">
        <Label>How was your experience?</Label>
        <StarRatingInput required />
        {state.fieldErrors?.rating && <p className="text-xs text-destructive">{state.fieldErrors.rating[0]}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="comment">Anything you&apos;d like to add? (optional)</Label>
        <textarea
          id="comment"
          name="comment"
          rows={4}
          placeholder="What went well, or what could be better..."
          className="w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {state.fieldErrors?.comment && <p className="text-xs text-destructive">{state.fieldErrors.comment[0]}</p>}
      </div>

      <SubmitButton />
    </form>
  );
}
