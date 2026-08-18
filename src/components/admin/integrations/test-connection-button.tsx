"use client";

import { useState, useTransition } from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { testIntegrationConnectionAction } from "@/app/(app)/admin/integrations/actions";

export function TestConnectionButton({ integrationId }: { integrationId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="ghost"
        loading={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await testIntegrationConnectionAction(integrationId);
            setError(result.error ?? null);
          })
        }
      >
        <Zap className="size-3.5" /> Test connection
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
