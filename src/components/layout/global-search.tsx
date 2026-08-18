"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/** Searches Users for now (the only indexed module in this phase); more modules register here as they ship. */
export function GlobalSearch() {
  const router = useRouter();

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const value = new FormData(e.currentTarget).get("q");
        const query = typeof value === "string" ? value.trim() : "";
        router.push(query ? `/admin/users?q=${encodeURIComponent(query)}` : "/admin/users");
      }}
      className="relative hidden w-full max-w-sm sm:block"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input name="q" placeholder="Search users..." className="pl-9" autoComplete="off" />
    </form>
  );
}
