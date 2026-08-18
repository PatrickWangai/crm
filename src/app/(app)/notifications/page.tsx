import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { requireUser } from "@/lib/rbac/guard";
import { listMyNotificationsPaginated } from "@/lib/services/notification.service";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { MarkAllReadButton } from "@/components/layout/mark-all-read-button";
import { cn } from "@/lib/utils";
import { Bell } from "lucide-react";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const sp = await searchParams;
  const page = typeof sp.page === "string" ? Number(sp.page) || 1 : 1;

  const { data: notifications, total, pageCount } = await listMyNotificationsPaginated(page);
  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <div>
      <PageHeader title="Notifications" description="Assignments, reminders and system alerts addressed to you." actions={hasUnread ? <MarkAllReadButton /> : undefined} />

      <div className="rounded-lg border border-border bg-card p-4">
        {notifications.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications yet" description="You'll see lead assignments, ticket updates and reminders here." />
        ) : (
          <>
            <ul className="divide-y divide-border">
              {notifications.map((n) => {
                const content = (
                  <div className={cn("flex items-start gap-3 px-1 py-3", !n.isRead && "bg-accent/30 -mx-1 rounded-md px-2")}>
                    {!n.isRead && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-sm text-muted-foreground">{n.message}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground/70">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
                    </div>
                  </div>
                );
                return <li key={n.id}>{n.relatedUrl ? <Link href={n.relatedUrl}>{content}</Link> : content}</li>;
              })}
            </ul>
            <Pagination page={page} pageCount={pageCount} total={total} />
          </>
        )}
      </div>
    </div>
  );
}
