"use client";

import { useEffect, useState } from "react";
import { Users, Radio, Eye, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { LiveActivitySnapshot } from "@/lib/services/live-activity.service";

const POLL_MS = 30_000;

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
}: {
  initial: LiveActivitySnapshot;
  refreshAction: () => Promise<LiveActivitySnapshot>;
}) {
  const [snapshot, setSnapshot] = useState(initial);

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
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Live visitors" value={snapshot.liveVisitorCount} icon={Radio} hint="on the help page right now" tone="success" />
        <StatCard label="Visitors today" value={snapshot.visitorsTodayCount} icon={Users} />
        <StatCard label="Page views today" value={snapshot.pageViewsToday} icon={Eye} />
        <StatCard label="Chats today" value={snapshot.chatsToday} icon={MessageSquare} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Every visitor who&apos;s touched the help page recently, refreshed every 30s.</CardDescription>
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
                    <th className="pb-2 font-medium">Last seen</th>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
