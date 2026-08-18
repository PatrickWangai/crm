"use client";

import { useTransition } from "react";
import type { OpportunityStage } from "@prisma/client";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateOpportunityStageAction, deleteOpportunityAction } from "@/app/(app)/leads/actions";
import { formatCurrency } from "@/lib/utils";

const STAGES: OpportunityStage[] = ["QUALIFICATION", "PROPOSAL", "NEGOTIATION", "RESERVATION", "CLOSED_WON", "CLOSED_LOST"];
const STAGE_LABELS: Record<OpportunityStage, string> = {
  QUALIFICATION: "Qualification",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  RESERVATION: "Reservation",
  CLOSED_WON: "Closed Won",
  CLOSED_LOST: "Closed Lost",
};

export function OpportunityCard({
  opportunity,
  leadId,
}: {
  opportunity: { id: string; code: string; title: string; value: string | number; probability: number; stage: OpportunityStage; expectedCloseDate: string | Date | null };
  leadId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium">{opportunity.title}</p>
        <p className="text-xs text-muted-foreground">
          {opportunity.code} &middot; {formatCurrency(Number(opportunity.value))} &middot; {opportunity.probability}% probability
          {opportunity.expectedCloseDate && ` · closes ${new Date(opportunity.expectedCloseDate).toLocaleDateString()}`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Select
          value={opportunity.stage}
          disabled={isPending}
          onValueChange={(value) =>
            startTransition(async () => {
              await updateOpportunityStageAction(opportunity.id, leadId, value as OpportunityStage);
            })
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {STAGE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            startTransition(async () => {
              await deleteOpportunityAction(opportunity.id, leadId);
            })
          }
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
