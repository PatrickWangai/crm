import { AlertTriangle } from "lucide-react";
import type { RoutingCheck } from "@/lib/services/department-routing";

/** Inline note shown under the Department field on the ticket detail page when the auto-routing engine disagrees with (or was never applied to) the ticket's current department — see department-routing.ts#checkRouting. */
export function RoutingCheckNote({ check }: { check: RoutingCheck }) {
  if (!check.needsReview) return null;

  const message =
    check.suggestion.status === "ambiguous"
      ? `Wording matches more than one department (${check.suggestion.departments.map((d) => d.name).join(", ")}) — review and route by hand.`
      : `Auto-routing suggests ${check.suggestion.departments[0].name} based on the wording — reassign if that looks right.`;

  return (
    <p className="flex items-start gap-1.5 rounded-md border border-warning/30 bg-warning-muted px-2.5 py-1.5 text-xs text-warning">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

/** Compact icon-only version for the tickets list, where space is tight — full explanation lives in the title tooltip. */
export function RoutingCheckIcon({ check }: { check: RoutingCheck }) {
  if (!check.needsReview) return null;

  const title =
    check.suggestion.status === "ambiguous"
      ? `Wording matches more than one department: ${check.suggestion.departments.map((d) => d.name).join(", ")}`
      : `Auto-routing suggests ${check.suggestion.departments[0].name}`;

  return (
    <span title={title} aria-label={title}>
      <AlertTriangle className="size-3.5 shrink-0 text-warning" />
    </span>
  );
}
