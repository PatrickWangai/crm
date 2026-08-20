import { Eye } from "lucide-react";
import { SupportStageStepper } from "@/components/support/support-stage-stepper";
import { getSupportStage } from "@/lib/support-stage";

/** What the customer actually sees on their own tracking page right now — same stepper, same stage logic, just rendered here so staff don't have to guess. */
export function CustomerTrackerPreview({ status, departmentOrBusinessUnitName }: { status: string; departmentOrBusinessUnitName: string | null }) {
  const { stage, label } = getSupportStage(status, departmentOrBusinessUnitName);

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Eye className="size-3.5" /> What the customer sees right now
      </p>
      <SupportStageStepper stage={stage} activeLabel={label} />
    </div>
  );
}
