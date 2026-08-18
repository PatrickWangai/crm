"use client";

import { useState, useTransition } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkFollowUpsDueAction } from "@/app/(app)/leads/actions";

export function CheckFollowUpsButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        loading={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await checkFollowUpsDueAction();
            setMessage(result.error ?? `Notified agents on ${result.flagged ?? 0} due follow-up(s).`);
          })
        }
      >
        <BellRing className="size-3.5" /> Check follow-ups
      </Button>
      {message && <span className="text-xs text-muted-foreground">{message}</span>}
    </div>
  );
}
