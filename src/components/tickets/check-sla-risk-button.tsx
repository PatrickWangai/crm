"use client";

import { useState, useTransition } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkSlaRiskAction } from "@/app/(app)/tickets/actions";

export function CheckSlaRiskButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        loading={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await checkSlaRiskAction();
            setMessage(result.error ?? `Notified Customer Care and assignees on ${result.flagged ?? 0} at-risk/breached ticket(s).`);
          })
        }
      >
        <BellRing className="size-3.5" /> Check SLA risk
      </Button>
      {message && <span className="text-xs text-muted-foreground">{message}</span>}
    </div>
  );
}
