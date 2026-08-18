import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import type { AiSuggestion } from "@/lib/services/ai.service";

const URGENCY_VARIANT: Record<AiSuggestion["urgency"], "destructive" | "warning" | "outline"> = {
  high: "destructive",
  medium: "warning",
  low: "outline",
};

export function AiSuggestionCard({ suggestion }: { suggestion: AiSuggestion }) {
  return (
    <Card className="sm:col-span-2 border-primary/30 bg-primary/[0.03]">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="size-4 text-primary" /> AI Suggested Next Action
        </CardTitle>
        <Badge variant={URGENCY_VARIANT[suggestion.urgency]}>{suggestion.urgency} priority</Badge>
      </CardHeader>
      <CardContent>
        <p className="text-sm font-medium">{suggestion.action}</p>
        <p className="mt-1 text-xs text-muted-foreground">{suggestion.reason}</p>
        <p className="mt-3 text-[11px] text-muted-foreground/70">
          Rule-based mock suggestion — the AI Assistant integration is not connected to a live model in this environment.
        </p>
      </CardContent>
    </Card>
  );
}
