import { StatusBadge } from "@/components/status-badge";
import { SupportStageStepper } from "@/components/support/support-stage-stepper";
import { ResponseCountdown } from "@/components/support/response-countdown";
import type { PublicTicketStatus } from "@/lib/validation/public-support";

/** The live status view — stepper, countdown, updates — shared between a manual lookup (Track a request) and the automatic view shown right after submitting, so both stay in sync as one component. */
export function TrackingResultCard({ result }: { result: PublicTicketStatus }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{result.subject}</p>
          <p className="text-xs text-muted-foreground">
            {result.ticketNumber} &middot; {result.category}
          </p>
        </div>
        <StatusBadge status={result.priority} />
      </div>

      <div className="mt-4 mb-1">
        <SupportStageStepper stage={result.stage} activeLabel={result.stageLabel} />
      </div>
      <ResponseCountdown expectedResponseBy={result.expectedResponseBy} stage={result.stage} />

      <p className="mt-3 text-xs text-muted-foreground">
        Submitted {new Date(result.createdAt).toLocaleString()}
        {result.resolvedAt && ` · Resolved ${new Date(result.resolvedAt).toLocaleString()}`}
      </p>

      {result.publicComments.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground">Updates</p>
          <ul className="space-y-2">
            {result.publicComments.map((c, i) => (
              <li key={i} className="rounded-md bg-secondary/50 p-2.5 text-sm">
                <p className="whitespace-pre-wrap">{c.comment}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
