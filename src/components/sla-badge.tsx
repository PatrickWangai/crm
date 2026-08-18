import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function formatRemaining(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes}m left`;
  const hours = minutes / 60;
  if (hours < 48) return `${Math.round(hours)}h left`;
  return `${Math.round(hours / 24)}d left`;
}

/** Renders an SLA countdown / breach indicator for a ticket, given its dueAt and current status. */
export function SlaBadge({ dueAt, status, className }: { dueAt: string | Date | null; status: string; className?: string }) {
  if (!dueAt) return <Badge variant="outline" className={className}>No SLA</Badge>;

  const due = new Date(dueAt);
  const now = new Date();
  const isClosedOut = status === "COMPLETED" || status === "CLOSED";
  const breached = due.getTime() < now.getTime();

  if (isClosedOut) {
    return breached ? (
      <Badge variant="destructive" className={className}>
        <AlertTriangle className="size-3" /> Resolved late
      </Badge>
    ) : (
      <Badge variant="success" className={className}>
        <CheckCircle2 className="size-3" /> Resolved on time
      </Badge>
    );
  }

  if (breached) {
    return (
      <Badge variant="destructive" className={className}>
        <AlertTriangle className="size-3" /> SLA breached
      </Badge>
    );
  }

  const remainingMs = due.getTime() - now.getTime();
  const urgent = remainingMs < 2 * 60 * 60_000;
  return (
    <Badge variant={urgent ? "warning" : "info"} className={className}>
      <Clock className="size-3" /> {formatRemaining(remainingMs)}
    </Badge>
  );
}
