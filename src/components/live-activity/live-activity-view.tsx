"use client";

import { useEffect, useState } from "react";
import { Users, Radio, Eye, MessageSquare, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { StaffChatPanel } from "@/components/live-activity/staff-chat-panel";
import { VisitorTimelineChart } from "@/components/live-activity/visitor-timeline-chart";
import type { LiveActivitySnapshot } from "@/lib/services/live-activity.service";
import type { LiveChatMessage } from "@/lib/validation/public-support";
import type { CreateTicketFromVisitorInput } from "@/lib/services/live-chat.service";
import type { CreateTicketFromVisitorState } from "@/app/(app)/live-activity/actions";

const POLL_MS = 30_000;

type ChatTarget = { type: "ticket"; ticketId: string; ticketNumber: string } | { type: "visitor"; sessionId: string };

function LiveDot() {
  return (
    <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-success">
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-success" />
      </span>
      Live
    </span>
  );
}

export function LiveActivityView({
  initial,
  refreshAction,
  fetchThread,
  sendMessage,
  fetchVisitorThread,
  sendVisitorMessage,
  createTicketFromVisitor,
}: {
  initial: LiveActivitySnapshot;
  refreshAction: () => Promise<LiveActivitySnapshot>;
  fetchThread: (ticketId: string) => Promise<LiveChatMessage[]>;
  sendMessage: (ticketId: string, content: string) => Promise<LiveChatMessage>;
  fetchVisitorThread: (sessionId: string) => Promise<LiveChatMessage[]>;
  sendVisitorMessage: (sessionId: string, content: string) => Promise<LiveChatMessage>;
  createTicketFromVisitor: (sessionId: string, input: CreateTicketFromVisitorInput) => Promise<CreateTicketFromVisitorState>;
}) {
  const [snapshot, setSnapshot] = useState(initial);
  const [openChat, setOpenChat] = useState<ChatTarget | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshAction()
        .then(setSnapshot)
        .catch(() => {});
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [refreshAction]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="size-4 text-success" /> Live visitors
          </CardTitle>
          <CardDescription>Concurrent visitors on the help page, last hour.</CardDescription>
        </CardHeader>
        <CardContent>
          <VisitorTimelineChart data={snapshot.visitorTimeline} />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Live visitors" value={snapshot.liveVisitorCount} icon={Radio} hint="on the help page right now" tone="success" />
        <StatCard label="Visitors today" value={snapshot.visitorsTodayCount} icon={Users} />
        <StatCard label="Page views today" value={snapshot.pageViewsToday} icon={Eye} />
        <StatCard label="Chats today" value={snapshot.chatsToday} icon={MessageSquare} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Every visitor who&apos;s touched the help page recently, refreshed every 30s. Chat with anyone — before or after they have a ticket.</CardDescription>
        </CardHeader>
        <CardContent>
          {snapshot.recent.length === 0 ? (
            <EmptyState icon={Users} title="No visitors yet" description="Activity appears here once someone opens the help page." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Source</th>
                    <th className="pb-2 pr-4 font-medium">Page</th>
                    <th className="pb-2 pr-4 font-medium">Ticket</th>
                    <th className="pb-2 pr-4 font-medium">Page views</th>
                    <th className="pb-2 pr-4 font-medium">First seen</th>
                    <th className="pb-2 pr-4 font-medium">Last seen</th>
                    <th className="pb-2 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {snapshot.recent.map((v) => (
                    <tr key={v.id}>
                      <td className="py-2 pr-4">{v.isLive ? <LiveDot /> : <span className="text-xs text-muted-foreground">Idle</span>}</td>
                      <td className="py-2 pr-4 capitalize">{v.source}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{v.path}</td>
                      <td className="py-2 pr-4">{v.ticketNumber ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="py-2 pr-4">{v.pageViews}</td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">{formatDistanceToNow(new Date(v.firstSeenAt), { addSuffix: true })}</td>
                      <td className="py-2 text-xs text-muted-foreground">{formatDistanceToNow(new Date(v.lastSeenAt), { addSuffix: true })}</td>
                      <td className="py-2 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() =>
                            setOpenChat(
                              v.ticketId && v.ticketNumber ? { type: "ticket", ticketId: v.ticketId, ticketNumber: v.ticketNumber } : { type: "visitor", sessionId: v.sessionId },
                            )
                          }
                        >
                          <MessageCircle className="size-3.5" /> Chat
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {openChat &&
        (openChat.type === "ticket" ? (
          <StaffChatPanel
            key={`ticket-${openChat.ticketId}`}
            title={openChat.ticketNumber}
            onClose={() => setOpenChat(null)}
            fetchThread={() => fetchThread(openChat.ticketId)}
            sendMessage={(content) => sendMessage(openChat.ticketId, content)}
          />
        ) : (
          <StaffChatPanel
            key={`visitor-${openChat.sessionId}`}
            title="Visitor (no ticket yet)"
            onClose={() => setOpenChat(null)}
            fetchThread={() => fetchVisitorThread(openChat.sessionId)}
            sendMessage={(content) => sendVisitorMessage(openChat.sessionId, content)}
            createTicket={(input) => createTicketFromVisitor(openChat.sessionId, input)}
          />
        ))}
    </div>
  );
}
