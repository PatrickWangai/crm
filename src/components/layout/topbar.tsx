import { getCurrentUser, permissionsOf } from "@/lib/auth/session";
import { listMyNotifications, countMyUnreadNotifications } from "@/lib/services/notification.service";
import { MobileNav } from "./mobile-nav";
import { GlobalSearch } from "./global-search";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";

export async function Topbar() {
  const user = await getCurrentUser();
  if (!user) return null;

  const granted = permissionsOf(user);
  const [notifications, unreadCount] = await Promise.all([
    listMyNotifications(8),
    countMyUnreadNotifications(),
  ]);

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-4 sm:px-6">
      <MobileNav grantedPermissions={Array.from(granted)} />
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {granted.has("users.manage") && <GlobalSearch />}
        <NotificationBell notifications={notifications} unreadCount={unreadCount} />
        <UserMenu email={user.email} roleName={user.role.name} />
      </div>
    </header>
  );
}
