import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import type { AiHistorySummary } from "@/lib/services/ai.service";

export function AiHistorySummaryCard({ summary }: { summary: AiHistorySummary }) {
  return (
    <Card className="sm:col-span-2 border-primary/30 bg-primary/[0.03]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="size-4 text-primary" /> AI Profile Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{summary.summary}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {summary.highlights.map((h) => (
            <Badge key={h} variant="outline">
              {h}
            </Badge>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground/70">
          Rule-based mock summary — the AI Assistant integration is not connected to a live model in this environment.
        </p>
      </CardContent>
    </Card>
  );
}
