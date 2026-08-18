"use client";

import { useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, LayoutGrid, Table2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/validation/task";

const ALL = "__all__";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  OVERDUE: "Overdue",
};

export function TaskFilters({ view }: { view: "table" | "kanban" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === ALL) params.delete(key);
    else params.set(key, value);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function setView(next: "table" | "kanban") {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", next);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search task title..."
            defaultValue={searchParams.get("q") ?? ""}
            className="pl-9"
            onChange={(e) => {
              const value = e.target.value;
              if (debounceRef.current) clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(() => setParam("q", value), 350);
            }}
          />
        </div>
        {view === "table" && (
          <Select defaultValue={searchParams.get("status") ?? ALL} onValueChange={(v) => setParam("status", v)}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {TASK_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select defaultValue={searchParams.get("priority") ?? ALL} onValueChange={(v) => setParam("priority", v)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All priorities</SelectItem>
            {TASK_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {p.charAt(0) + p.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1 rounded-md border border-border p-1">
        <Button variant={view === "table" ? "secondary" : "ghost"} size="sm" onClick={() => setView("table")}>
          <Table2 className="size-3.5" /> Table
        </Button>
        <Button variant={view === "kanban" ? "secondary" : "ghost"} size="sm" onClick={() => setView("kanban")}>
          <LayoutGrid className="size-3.5" /> Board
        </Button>
      </div>
    </div>
  );
}
