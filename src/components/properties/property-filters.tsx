"use client";

import { useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PROPERTY_TYPES } from "@/lib/validation/property";
import type { Option } from "@/components/admin/users/user-form-sheet";

const ALL = "__all__";

export function PropertyFilters({ businessUnits }: { businessUnits: Option[] }) {
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

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search name, code, city..."
          defaultValue={searchParams.get("q") ?? ""}
          className="pl-9"
          onChange={(e) => {
            const value = e.target.value;
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => setParam("q", value), 350);
          }}
        />
      </div>
      <Select defaultValue={searchParams.get("propertyType") ?? ALL} onValueChange={(v) => setParam("propertyType", v)}>
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="All property types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All property types</SelectItem>
          {PROPERTY_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {t}
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
  );
}
