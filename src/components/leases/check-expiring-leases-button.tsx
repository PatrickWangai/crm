"use client";

import { useState, useTransition } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkExpiringLeasesAction } from "@/app/(app)/leases/actions";

export function CheckExpiringLeasesButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        loading={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await checkExpiringLeasesAction();
            setMessage(result.error ?? `Flagged ${result.flagged ?? 0} lease(s) expiring within 30 days.`);
          })
        }
      >
        <BellRing className="size-3.5" /> Check renewals
      </Button>
      {message && <span className="text-xs text-muted-foreground">{message}</span>}
    </div>
  );
}
