import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  tone?: "default" | "success" | "warning" | "destructive" | "info";
}) {
  const toneClasses: Record<string, string> = {
    default: "bg-primary/10 text-primary",
    success: "bg-success-muted text-success",
    warning: "bg-warning-muted text-warning",
    destructive: "bg-destructive/10 text-destructive",
    info: "bg-info-muted text-info",
  };

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 pt-5">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", toneClasses[tone])}>
          <Icon className="size-4.5" />
        </div>
      </CardContent>
    </Card>
  );
}
