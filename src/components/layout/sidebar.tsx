import Link from "next/link";
import { Building2 } from "lucide-react";
import { NavLinks } from "./nav-links";

export function Sidebar({ grantedPermissions }: { grantedPermissions: string[] }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <Link href="/dashboard" className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-white">
          <Building2 className="size-4.5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-white">Masterways CRM</p>
          <p className="text-[11px] text-sidebar-foreground/60">Group of Companies</p>
        </div>
      </Link>
      <NavLinks grantedPermissions={grantedPermissions} />
    </aside>
  );
}
