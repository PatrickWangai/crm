"use client";

import { useTransition } from "react";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markAllNotificationsReadAction } from "@/app/actions/notifications";

export function MarkAllReadButton() {
  const [isPending, startTransition] = useTransition();
  return (
    <Button variant="outline" loading={isPending} onClick={() => startTransition(() => markAllNotificationsReadAction())}>
      <CheckCheck className="size-3.5" /> Mark all read
    </Button>
  );
}
