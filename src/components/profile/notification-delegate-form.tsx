"use client";

import { useState, useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setNotificationDelegateAction } from "@/app/(app)/profile/actions";

interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
}

const NONE = "__none__";

/** A backup contact who also receives your notifications — doesn't replace you, just adds a second recipient (e.g. while you're away). */
export function NotificationDelegateForm({ candidates, currentDelegateId }: { candidates: Candidate[]; currentDelegateId: string | null }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={currentDelegateId ?? NONE}
        disabled={isPending}
        onValueChange={(value) =>
          startTransition(async () => {
            const res = await setNotificationDelegateAction(value === NONE ? null : value);
            setMessage(res.error ?? "Saved.");
          })
        }
      >
        <SelectTrigger className="w-64">
          <SelectValue placeholder="No delegate" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>No delegate</SelectItem>
          {candidates.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.firstName} {c.lastName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {message && <span className="text-xs text-muted-foreground">{message}</span>}
    </div>
  );
}
