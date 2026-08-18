"use client";

import { useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, LayoutGrid, Table2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LEAD_SOURCES, LEAD_STATUSES } from "@/lib/validation/lead";
import type { Option } from "@/components/admin/users/user-form-sheet";

const ALL = "__all__";

const SOURCE_LABELS: Record<string, string> = {
  WEBSITE: "Website",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
  EMAIL: "Email",
  WALK_IN: "Walk-in",
  REFERRAL: "Referral",
  PROPERTY_INQUIRY: "Property Inquiry",
  CAMPAIGN: "Campaign",
  OTHER: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  NEGOTIATION: "Negotiation",
  VIEWING_SCHEDULED: "Viewing Scheduled",
  RESERVATION: "Reservation",
  CLOSED_WON: "Closed Won",
  CLOSED_LOST: "Closed Lost",
};

export function LeadFilters({ businessUnits, view }: { businessUnits: Option[]; view: "table" | "kanban" }) {
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
            placeholder="Search name, email, phone, code..."
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
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select defaultValue={searchParams.get("source") ?? ALL} onValueChange={(v) => setParam("source", v)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All sources</SelectItem>
            {LEAD_SOURCES.map((s) => (
              <SelectItem key={s} value={s}>
                {SOURCE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select defaultValue={searchParams.get("businessUnitId") ?? ALL} onValueChange={(v) => setParam("businessUnitId", v)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All business units" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All business units</SelectItem>
            {businessUnits.map((bu) => (
              <SelectItem key={bu.id} value={bu.id}>
                {bu.name}
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
          <LayoutGrid className="size-3.5" /> Pipeline
        </Button>
      </div>
    </div>
  );
}
