"use client";

import { useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALL = "__all__";

const CHANNELS = ["CALL", "EMAIL", "SMS", "WHATSAPP", "MEETING", "NOTE", "WALK_IN"] as const;
const CHANNEL_LABELS: Record<string, string> = {
  CALL: "Call",
  EMAIL: "Email",
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
  MEETING: "Meeting",
  NOTE: "Note",
  WALK_IN: "Walk-in",
};

export function CommunicationFilters() {
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
          placeholder="Search content..."
          defaultValue={searchParams.get("q") ?? ""}
          className="pl-9"
          onChange={(e) => {
            const value = e.target.value;
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => setParam("q", value), 350);
          }}
        />
      </div>
      <Select defaultValue={searchParams.get("channel") ?? ALL} onValueChange={(v) => setParam("channel", v)}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="All channels" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All channels</SelectItem>
          {CHANNELS.map((c) => (
            <SelectItem key={c} value={c}>
              {CHANNEL_LABELS[c]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select defaultValue={searchParams.get("direction") ?? ALL} onValueChange={(v) => setParam("direction", v)}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="All directions" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All directions</SelectItem>
          <SelectItem value="INBOUND">Inbound</SelectItem>
          <SelectItem value="OUTBOUND">Outbound</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
