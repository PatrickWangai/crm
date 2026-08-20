import { AlertTriangle } from "lucide-react";
import type { RoutingCheck } from "@/lib/services/department-routing";

/** Inline note shown under the Department field on the ticket detail page when a ticket's department doesn't match what its category routes to, or the wording hints at a different one — see department-routing.ts#checkRouting. */
export function RoutingCheckNote({ check }: { check: RoutingCheck }) {
  if (!check.needsReview || !check.message) return null;

  return (
    <p className="flex items-start gap-1.5 rounded-md border border-warning/30 bg-warning-muted px-2.5 py-1.5 text-xs text-warning">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
      <span>{check.message}</span>
    </p>
  );
}

/** Compact icon-only version for the tickets list, where space is tight — full explanation lives in the title tooltip. */
export function RoutingCheckIcon({ check }: { check: RoutingCheck }) {
  if (!check.needsReview || !check.message) return null;

  return (
    <span title={check.message} aria-label={check.message}>
      <AlertTriangle className="size-3.5 shrink-0 text-warning" />
    </span>
  );
}
