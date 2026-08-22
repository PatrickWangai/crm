"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { markAllNotificationsReadAction, markNotificationReadAction, getNotificationSnapshotAction } from "@/app/actions/notifications";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string | Date;
  relatedUrl?: string | null;
}

const POLL_INTERVAL_MS = 20_000;

// Browsers refuse to let a freshly-created AudioContext actually produce
// sound until it's been resumed inside a genuine user gesture (click/key/
// touch) — one created from a setInterval callback stays permanently
// "suspended" with no error thrown, so it silently never plays. A single
// context, created and resumed once on the page's first interaction (see
// the effect below) and reused from then on, stays "running" for the rest
// of the session, so later timer-triggered alerts work.
let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!sharedAudioContext) sharedAudioContext = new AudioContextClass();
  return sharedAudioContext;
}

/** Short two-note attention chime, synthesized so no audio asset is needed — the "loud alert" equivalent of a delivery app's new-order chime. Silently no-ops if the context is still locked (no user gesture yet) or audio is unavailable. */
function playAlertTone() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();

    const notes = [
      { freq: 880, start: 0 },
      { freq: 1108, start: 0.12 },
    ];
    for (const { freq, start } of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t0 = ctx.currentTime + start;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.35);
    }
  } catch {
    // Audio unavailable/blocked — the visual pulse below still conveys the alert.
  }
}

/**
 * Polls for new notifications every 20s so an incoming ticket (or any other
 * notification) grabs attention without requiring a page reload or a full
 * websocket/push infrastructure — a short tone + a pulsing bell, similar in
 * spirit to a delivery app's tablet alert. The first snapshot after mount
 * never triggers the alert, only ones after it that increase the unread
 * count.
 */
export function NotificationBell({ notifications: initialNotifications, unreadCount: initialUnreadCount }: { notifications: NotificationItem[]; unreadCount: number }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [alerting, setAlerting] = useState(false);
  const lastUnreadCount = useRef(initialUnreadCount);

  // Unlocks audio on this user's very first interaction with the page
  // (click, keypress or touch anywhere) — doesn't matter what they click,
  // the browser just needs to see a genuine gesture before it'll let the
  // shared AudioContext actually produce sound. Runs once per page load.
  useEffect(() => {
    function unlock() {
      const ctx = getAudioContext();
      if (ctx && ctx.state === "suspended") void ctx.resume();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    }
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(async () => {
      const snapshot = await getNotificationSnapshotAction();
      if (snapshot.unreadCount > lastUnreadCount.current) {
        playAlertTone();
        setAlerting(true);
        setTimeout(() => setAlerting(false), 2500);
      }
      lastUnreadCount.current = snapshot.unreadCount;
      setNotifications(snapshot.notifications);
      setUnreadCount(snapshot.unreadCount);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("relative", alerting && "animate-pulse")} aria-label="Notifications">
          <Bell className={cn("size-5", alerting && "text-destructive")} />
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
              onClick={() =>
                startTransition(async () => {
                  await markAllNotificationsReadAction();
                  setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
                  setUnreadCount(0);
                  lastUnreadCount.current = 0;
                })
              }
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
                    if (!n.isRead) {
                      await markNotificationReadAction(n.id);
                      setNotifications((prev) => prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item)));
                      setUnreadCount((prev) => Math.max(0, prev - 1));
                      lastUnreadCount.current = Math.max(0, lastUnreadCount.current - 1);
                    }
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
