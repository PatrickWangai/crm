"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { approveInvoiceAction, rejectInvoiceAction } from "@/app/(app)/finance/actions";

export function ApproveInvoiceButtons({ invoiceId }: { invoiceId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center justify-end gap-1">
      {error && <span className="text-xs text-destructive">{error}</span>}
      <Button
        size="sm"
        variant="outline"
        loading={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await rejectInvoiceAction(invoiceId);
            if (result.error) setError(result.error);
          })
        }
      >
        <X className="size-3.5" /> Reject
      </Button>
      <Button
        size="sm"
        loading={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await approveInvoiceAction(invoiceId);
            if (result.error) setError(result.error);
          })
        }
      >
        <Check className="size-3.5" /> Approve
      </Button>
    </div>
  );
}
