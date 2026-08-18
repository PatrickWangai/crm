"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/app/actions/notifications";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string | Date;
  relatedUrl?: string | null;
}

export function NotificationBell({ notifications, unreadCount }: { notifications: NotificationItem[]; unreadCount: number }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-destructive ring-2 ring-card" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <button
              disabled={isPending}
              onClick={() => startTransition(() => markAllNotificationsReadAction())}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No notifications yet"
              description="You'll see lead assignments, ticket updates and reminders here."
              className="border-none py-8"
            />
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() =>
                  startTransition(async () => {
                    if (!n.isRead) await markNotificationReadAction(n.id);
                    if (n.relatedUrl) router.push(n.relatedUrl);
                  })
                }
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 border-b border-border px-4 py-3 text-left transition-colors last:border-0 hover:bg-secondary/50",
                  !n.isRead && "bg-accent/40",
                )}
              >
                <div className="flex w-full items-center gap-2">
                  {!n.isRead && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                  <p className="truncate text-sm font-medium">{n.title}</p>
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                <p className="text-[11px] text-muted-foreground/70">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </p>
              </button>
            ))
          )}
        </div>
        <Link href="/notifications" className="block border-t border-border px-4 py-2.5 text-center text-xs font-medium text-primary hover:underline">
          View all notifications
        </Link>
      </PopoverContent>
    </Popover>
  );
}
