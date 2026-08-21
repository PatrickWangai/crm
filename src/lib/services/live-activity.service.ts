import "server-only";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/rbac/guard";

// A visit counts as "live" if its last heartbeat landed within this window —
// the client pings every 25s (see presence-tracker.tsx), so a visitor who
// closed the tab goes quiet for good within one missed heartbeat of this.
const LIVE_WINDOW_MS = 60_000;

export interface LiveActivitySnapshot {
  liveVisitorCount: number;
  visitorsTodayCount: number;
  pageViewsToday: number;
  chatsToday: number;
  recent: Array<{
    id: string;
    source: string;
    path: string;
    ticketNumber: string | null;
    pageViews: number;
    firstSeenAt: Date;
    lastSeenAt: Date;
    isLive: boolean;
  }>;
}

export async function getLiveActivitySnapshot(): Promise<LiveActivitySnapshot> {
  await requirePermission("live_activity.view");

  const now = new Date();
  const liveSince = new Date(now.getTime() - LIVE_WINDOW_MS);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const [liveVisitorCount, todayVisits, chatsToday, recent] = await Promise.all([
    prisma.helpPageVisit.count({ where: { lastSeenAt: { gte: liveSince } } }),
    prisma.helpPageVisit.findMany({
      where: { lastSeenAt: { gte: startOfToday } },
      select: { pageViews: true },
    }),
    prisma.communication.count({
      where: { channel: "CHATBOT", createdAt: { gte: startOfToday } },
    }),
    prisma.helpPageVisit.findMany({
      orderBy: { lastSeenAt: "desc" },
      take: 20,
    }),
  ]);

  return {
    liveVisitorCount,
    visitorsTodayCount: todayVisits.length,
    pageViewsToday: todayVisits.reduce((sum, v) => sum + v.pageViews, 0),
    chatsToday,
    recent: recent.map((v) => ({
      id: v.id,
      source: v.source,
      path: v.path,
      ticketNumber: v.ticketNumber,
      pageViews: v.pageViews,
      firstSeenAt: v.firstSeenAt,
      lastSeenAt: v.lastSeenAt,
      isLive: v.lastSeenAt >= liveSince,
    })),
  };
}
