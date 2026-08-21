import { requirePermissionOrRedirect } from "@/lib/rbac/guard";
import { getLiveActivitySnapshot } from "@/lib/services/live-activity.service";
import { PageHeader } from "@/components/layout/page-header";
import { LiveActivityView } from "@/components/live-activity/live-activity-view";
import {
  refreshLiveActivityAction,
  fetchStaffChatThreadAction,
  sendStaffChatMessageAction,
  fetchStaffVisitorThreadAction,
  sendStaffVisitorMessageAction,
  createTicketFromVisitorAction,
} from "./actions";

export default async function LiveActivityPage() {
  await requirePermissionOrRedirect("live_activity.view");

  const snapshot = await getLiveActivitySnapshot();

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader title="Live Activity" description="Who's on the help page right now, and today's visitor and chat volume." />
      <LiveActivityView
        initial={snapshot}
        refreshAction={refreshLiveActivityAction}
        fetchThread={fetchStaffChatThreadAction}
        sendMessage={sendStaffChatMessageAction}
        fetchVisitorThread={fetchStaffVisitorThreadAction}
        sendVisitorMessage={sendStaffVisitorMessageAction}
        createTicketFromVisitor={createTicketFromVisitorAction}
      />
    </div>
  );
}
