"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { labelize } from "@/lib/utils";
import { TICKET_STATUSES } from "@/lib/validation/ticket";
import type { Option } from "@/components/admin/users/user-form-sheet";

const ALL = "__all__";

export function ReportFiltersBar({
  businessUnits,
  departments,
  staff,
  regions,
}: {
  businessUnits: Option[];
  departments: Option[];
  staff: Option[];
  regions: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hasFilters = ["dateFrom", "dateTo", "businessUnitId", "departmentId", "employeeId", "region", "status"].some((k) => searchParams.get(k));

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === ALL) params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  function reset() {
    router.push(pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <Input type="date" className="w-[9.5rem]" defaultValue={searchParams.get("dateFrom") ?? ""} onChange={(e) => setParam("dateFrom", e.target.value)} aria-label="From date" />
        <span className="text-xs text-muted-foreground">to</span>
        <Input type="date" className="w-[9.5rem]" defaultValue={searchParams.get("dateTo") ?? ""} onChange={(e) => setParam("dateTo", e.target.value)} aria-label="To date" />
      </div>

      <Select defaultValue={searchParams.get("businessUnitId") ?? ALL} onValueChange={(v) => setParam("businessUnitId", v)}>
        <SelectTrigger className="w-full sm:w-44">
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

      <Select defaultValue={searchParams.get("departmentId") ?? ALL} onValueChange={(v) => setParam("departmentId", v)}>
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="All departments" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All departments</SelectItem>
          {departments.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select defaultValue={searchParams.get("employeeId") ?? ALL} onValueChange={(v) => setParam("employeeId", v)}>
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="All employees" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All employees</SelectItem>
          {staff.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select defaultValue={searchParams.get("region") ?? ALL} onValueChange={(v) => setParam("region", v)}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="All regions" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All regions</SelectItem>
          {regions.map((r) => (
            <SelectItem key={r} value={r}>
              {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select defaultValue={searchParams.get("status") ?? ALL} onValueChange={(v) => setParam("status", v)}>
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {TICKET_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {labelize(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={reset}>
          <X className="size-3.5" /> Clear filters
        </Button>
      )}

      <p className="w-full text-xs text-muted-foreground">Status narrows the Customer Service and Customer Complaints sections only — other sections use their own status breakdowns.</p>
    </div>
  );
}
