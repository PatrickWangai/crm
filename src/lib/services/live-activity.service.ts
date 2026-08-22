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
  /** Concurrent-visitor count in 5-minute buckets over the last hour, derived from each visit's firstSeenAt/lastSeenAt span — not a stored time series (there isn't one), so this is an approximation of who was active in each window, not a true per-second count. */
  visitorTimeline: Array<{ label: string; count: number }>;
  recent: Array<{
    id: string;
    sessionId: string;
    source: string;
    path: string;
    ticketNumber: string | null;
    ticketId: string | null;
    pageViews: number;
    firstSeenAt: Date;
    lastSeenAt: Date;
    isLive: boolean;
  }>;
}

const EMPTY_SNAPSHOT: LiveActivitySnapshot = { liveVisitorCount: 0, visitorsTodayCount: 0, pageViewsToday: 0, chatsToday: 0, visitorTimeline: [], recent: [] };

const TIMELINE_BUCKET_MS = 5 * 60_000;
const TIMELINE_BUCKETS = 12; // last 60 minutes

/**
 * Every customer-facing department gets this view — "Chat with anyone,
 * before or after they have a ticket" is the point of this page, so a
 * visitor without a ticket yet (nobody's claimed them) is visible to every
 * department, not just Customer Care; a visitor already tied to a ticket
 * is scoped to that ticket's actual department, since someone specific
 * already owns it. HelpPageVisit has no direct departmentId (it's keyed by
 * an anonymous sessionId, not a ticket), so the ticketed case is scoped by
 * joining through ticketNumber -> Ticket.departmentId.
 */
export async function getLiveActivitySnapshot(): Promise<LiveActivitySnapshot> {
  const actor = await requirePermission("live_activity.view");
  if (!actor.department) return EMPTY_SNAPSHOT;

  const departmentId = actor.department.id;

  const now = new Date();
  const liveSince = new Date(now.getTime() - LIVE_WINDOW_MS);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const [candidateVisits, chatsToday] = await Promise.all([
    prisma.helpPageVisit.findMany({
      where: { lastSeenAt: { gte: startOfToday } },
      orderBy: { lastSeenAt: "desc" },
    }),
    prisma.communication.count({
      where: {
        channel: "CHATBOT",
        createdAt: { gte: startOfToday },
        OR: [{ relatedTicket: { departmentId } }, { relatedTicketId: null }],
      },
    }),
  ]);

  const ticketNumbers = Array.from(new Set(candidateVisits.map((v) => v.ticketNumber).filter((t): t is string => !!t)));
  const tickets = ticketNumbers.length
    ? await prisma.ticket.findMany({ where: { ticketNumber: { in: ticketNumbers } }, select: { id: true, ticketNumber: true, departmentId: true } })
    : [];
  const ticketByNumber = new Map(tickets.map((t) => [t.ticketNumber, t]));

  const scoped = candidateVisits.filter((v) => (v.ticketNumber ? ticketByNumber.get(v.ticketNumber)?.departmentId === departmentId : true));

  const visitorTimeline: LiveActivitySnapshot["visitorTimeline"] = [];
  for (let i = TIMELINE_BUCKETS - 1; i >= 0; i--) {
    const bucketEnd = new Date(now.getTime() - i * TIMELINE_BUCKET_MS);
    const bucketStart = new Date(bucketEnd.getTime() - TIMELINE_BUCKET_MS);
    const count = scoped.filter((v) => v.firstSeenAt <= bucketEnd && v.lastSeenAt >= bucketStart).length;
    visitorTimeline.push({ label: bucketEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), count });
  }

  return {
    liveVisitorCount: scoped.filter((v) => v.lastSeenAt >= liveSince).length,
    visitorsTodayCount: scoped.length,
    pageViewsToday: scoped.reduce((sum, v) => sum + v.pageViews, 0),
    chatsToday,
    visitorTimeline,
    recent: scoped.slice(0, 20).map((v) => ({
      id: v.id,
      sessionId: v.sessionId,
      source: v.source,
      path: v.path,
      ticketNumber: v.ticketNumber,
      ticketId: v.ticketNumber ? (ticketByNumber.get(v.ticketNumber)?.id ?? null) : null,
      pageViews: v.pageViews,
      firstSeenAt: v.firstSeenAt,
      lastSeenAt: v.lastSeenAt,
      isLive: v.lastSeenAt >= liveSince,
    })),
  };
}
