"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { NavLinks } from "./nav-links";

export function MobileNav({ grantedPermissions }: { grantedPermissions: string[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
        <Menu className="size-5" />
      </Button>
      <SheetContent side="left" className="w-72 max-w-[85vw] bg-sidebar p-0 text-sidebar-foreground [&>button]:text-sidebar-foreground">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <Link href="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-white">
            <Building2 className="size-4.5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">Masterways CRM</p>
            <p className="text-[11px] text-sidebar-foreground/60">Group of Companies</p>
          </div>
        </Link>
        <NavLinks grantedPermissions={grantedPermissions} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
