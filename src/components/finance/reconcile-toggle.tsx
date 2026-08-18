"use client";

import { useState, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { toggleReconcilePaymentAction } from "@/app/(app)/finance/actions";

export function ReconcileToggle({ paymentId, isReconciled }: { paymentId: string; isReconciled: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <Checkbox
        checked={isReconciled}
        disabled={isPending}
        onCheckedChange={() =>
          startTransition(async () => {
            const result = await toggleReconcilePaymentAction(paymentId);
            if (result.error) setError(result.error);
          })
        }
        aria-label="Mark reconciled"
      />
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
