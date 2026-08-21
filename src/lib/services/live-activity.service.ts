import "server-only";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/rbac/guard";

// A visit counts as "live" if its last heartbeat landed within this window —
// the client pings every 25s (see presence-tracker.tsx), so a visitor who
// closed the tab goes quiet for good within one missed heartbeat of this.
const LIVE_WINDOW_MS = 60_000;

// Anonymous browsing that hasn't produced a ticket yet (no ticketNumber on
// the visit) has no department of its own — it defaults to whichever
// Customer Care team is the general front desk, same fallback used for
// undifferentiated ticket routing (see department-routing.ts).
const CARE_DEPARTMENT_CODES = ["CARE_MRE", "CARE_SACCO"];

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
    ticketId: string | null;
    pageViews: number;
    firstSeenAt: Date;
    lastSeenAt: Date;
    isLive: boolean;
  }>;
}

const EMPTY_SNAPSHOT: LiveActivitySnapshot = { liveVisitorCount: 0, visitorsTodayCount: 0, pageViewsToday: 0, chatsToday: 0, recent: [] };

/**
 * Every customer-facing department gets this view now, not just Customer
 * Care — each department only sees visitors/chats tied to its own tickets.
 * HelpPageVisit has no direct departmentId (it's keyed by an anonymous
 * sessionId, not a ticket), so scoping works by joining through
 * ticketNumber -> Ticket.departmentId; a visit with no ticket yet is only
 * visible to the relevant Customer Care team, since that's the default
 * landing spot for undifferentiated traffic.
 */
export async function getLiveActivitySnapshot(): Promise<LiveActivitySnapshot> {
  const actor = await requirePermission("live_activity.view");
  if (!actor.department) return EMPTY_SNAPSHOT;

  const isCareTeam = CARE_DEPARTMENT_CODES.includes(actor.department.code);
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
        OR: [{ relatedTicket: { departmentId } }, ...(isCareTeam ? [{ relatedTicketId: null }] : [])],
      },
    }),
  ]);

  const ticketNumbers = Array.from(new Set(candidateVisits.map((v) => v.ticketNumber).filter((t): t is string => !!t)));
  const tickets = ticketNumbers.length
    ? await prisma.ticket.findMany({ where: { ticketNumber: { in: ticketNumbers } }, select: { id: true, ticketNumber: true, departmentId: true } })
    : [];
  const ticketByNumber = new Map(tickets.map((t) => [t.ticketNumber, t]));

  const scoped = candidateVisits.filter((v) => (v.ticketNumber ? ticketByNumber.get(v.ticketNumber)?.departmentId === departmentId : isCareTeam));

  return {
    liveVisitorCount: scoped.filter((v) => v.lastSeenAt >= liveSince).length,
    visitorsTodayCount: scoped.length,
    pageViewsToday: scoped.reduce((sum, v) => sum + v.pageViews, 0),
    chatsToday,
    recent: scoped.slice(0, 20).map((v) => ({
      id: v.id,
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
