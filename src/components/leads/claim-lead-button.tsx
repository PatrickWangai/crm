"use client";

import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { claimLeadAction } from "@/app/(app)/leads/actions";

export function ClaimLeadButton({ leadId }: { leadId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        loading={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await claimLeadAction(leadId);
            if (result.error) setError(result.error);
          })
        }
      >
        <UserPlus className="size-3.5" /> Claim this lead
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
