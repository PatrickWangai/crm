"use client";

import { useState, useTransition } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkOverdueTasksAction } from "@/app/(app)/tasks/actions";

export function CheckOverdueTasksButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        loading={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await checkOverdueTasksAction();
            setMessage(result.error ?? `Flagged ${result.flagged ?? 0} overdue task(s).`);
          })
        }
      >
        <BellRing className="size-3.5" /> Check overdue
      </Button>
      {message && <span className="text-xs text-muted-foreground">{message}</span>}
    </div>
  );
}
