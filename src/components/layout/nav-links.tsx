"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS } from "@/lib/nav-config";
import { getLiveVisitorAlertCountAction } from "@/app/(app)/live-activity/actions";

const LIVE_ALERT_POLL_MS = 20_000;

/** Same pulsing-dot language as the "LIVE" indicator on the Live Activity page's own visitor table (see live-activity-view.tsx), so the sidebar badge reads as the same signal rather than a different one. */
function LiveBadge({ count }: { count: number }) {
  return (
    <span className="ml-auto flex items-center gap-1 rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold text-success" title={`${count} live visitor${count === 1 ? "" : "s"}`}>
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-success" />
      </span>
      {count}
    </span>
  );
}

export function NavLinks({
  grantedPermissions,
  onNavigate,
}: {
  grantedPermissions: string[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const granted = new Set(grantedPermissions);
  const [liveVisitorCount, setLiveVisitorCount] = useState(0);

  function isVisible(permission: string | string[]): boolean {
    return Array.isArray(permission) ? permission.some((code) => granted.has(code)) : granted.has(permission);
  }

  // Polled from every authenticated page, not just Live Activity itself —
  // the point is that a department head browsing Tickets or the Dashboard
  // still sees a customer waiting in chat without needing to be on that
  // page. Scoped per-account server-side (see getLiveVisitorAlertCount),
  // so this only fires for accounts that can actually act on it.
  useEffect(() => {
    if (!granted.has("live_activity.view")) return;
    let cancelled = false;
    async function tick() {
      const count = await getLiveVisitorAlertCountAction().catch(() => 0);
      if (!cancelled) setLiveVisitorCount(count);
    }
    void tick();
    const id = setInterval(tick, LIVE_ALERT_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- grantedPermissions is stable for the life of a session (comes from the user's own role), re-running on every render would restart polling constantly
  }, []);

  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      {NAV_SECTIONS.map((section) => {
        const visibleItems = section.items.filter((item) => isVisible(item.permission));
        if (visibleItems.length === 0) return null;
        return (
          <div key={section.label} className="space-y-1">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
              {section.label}
            </p>
            {visibleItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-foreground-active"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground-active",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {item.href === "/live-activity" && liveVisitorCount > 0 && <LiveBadge count={liveVisitorCount} />}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
