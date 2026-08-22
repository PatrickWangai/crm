import { requireUser } from "@/lib/rbac/guard";
import { permissionsOf } from "@/lib/auth/session";
import { isAiAssistantEnabled } from "@/lib/services/ai.service";
import { AiAssistantProvider } from "@/lib/ai/ai-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { StaffAssistant } from "@/components/assistant/staff-assistant";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const granted = Array.from(permissionsOf(user));
  const aiEnabled = await isAiAssistantEnabled();

  return (
    <AiAssistantProvider enabled={aiEnabled}>
      {/* relative + overflow-hidden together, not overflow-hidden alone: without a
          positioning context here, a stray `position: absolute` descendant (e.g.
          Radix Select's hidden native <select>, used for form autofill) resolves
          its containing block all the way up to <body>/<html> instead of this box —
          overflow-hidden alone clips its paint but not its contribution to
          document.scrollHeight, which let the whole page (sidebar included) become
          wheel-scrollable and drag the fixed-height layout out of view. */}
      <div className="relative flex h-screen w-full overflow-hidden bg-background">
        <Sidebar grantedPermissions={granted} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
      {aiEnabled && <StaffAssistant />}
    </AiAssistantProvider>
  );
}
