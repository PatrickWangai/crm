"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

function formatRemaining(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${Math.max(minutes, 1)}m remaining`;
}

/**
 * Live countdown to the ticket's SLA deadline (dueAt), mirroring the "prep
 * time" countdown a delivery app shows while an order is being made. Ticks
 * every 30s client-side — plenty for a response-time estimate, no need for
 * per-second precision. Hidden once the request is done or no deadline
 * exists (e.g. no SLA policy configured for that priority/business unit).
 */
export function ResponseCountdown({ expectedResponseBy, stage }: { expectedResponseBy: string | null; stage: 1 | 2 | 3 }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!expectedResponseBy || stage === 3) return null;

  const due = new Date(expectedResponseBy).getTime();
  const remaining = due - now;
  const overdue = remaining <= 0;

  return (
    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
      <Clock className="size-3.5 shrink-0" />
      {overdue ? (
        <span>Response window has passed — our team is still on it.</span>
      ) : (
        <span>
          Expected response by {new Date(expectedResponseBy).toLocaleString()} · {formatRemaining(remaining)}
        </span>
      )}
    </p>
  );
}
