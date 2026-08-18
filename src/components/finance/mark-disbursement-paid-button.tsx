"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markDisbursementPaidAction } from "@/app/(app)/finance/actions";

export function MarkDisbursementPaidButton({ disbursementId }: { disbursementId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center justify-end gap-2">
      {error && <span className="text-xs text-destructive">{error}</span>}
      <Button
        size="sm"
        loading={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await markDisbursementPaidAction(disbursementId);
            if (result.error) setError(result.error);
          })
        }
      >
        <Check className="size-3.5" /> Mark paid
      </Button>
    </div>
  );
}
