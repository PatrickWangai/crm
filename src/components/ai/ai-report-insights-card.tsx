import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, TrendingUp } from "lucide-react";
import type { AiReportInsights } from "@/lib/services/ai.service";

export function AiReportInsightsCard({ insights }: { insights: AiReportInsights }) {
  return (
    <Card className="border-primary/30 bg-primary/[0.03]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="size-4 text-primary" /> AI Summary &amp; Forecast
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
          {insights.summary.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {insights.forecast && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
            <TrendingUp className="size-4 text-primary" />
            <span className="font-medium">{insights.forecast.label}:</span>
            <span>{insights.forecast.value}</span>
          </div>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground/70">
          Rule-based mock summary and trend forecast — the AI Assistant integration is not connected to a live model in this environment.
        </p>
      </CardContent>
    </Card>
  );
}
