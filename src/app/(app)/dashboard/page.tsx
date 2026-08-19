import Link from "next/link";
import { requireUser, hasPermission } from "@/lib/rbac/guard";
import {
  getFinanceSnapshot,
  getMyOrgContext,
  getMyPipelineSnapshot,
  getMyTicketSnapshot,
  getOrgOverview,
  getPropertySnapshot,
  getRecentActivity,
} from "@/lib/services/dashboard.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { BusinessUnitChart, RoleDistributionChart } from "@/components/dashboard/org-charts";
import { formatCurrency } from "@/lib/utils";
import {
  Users,
  Building2,
  Landmark,
  ShieldCheck,
  Bell,
  ClipboardList,
  ArrowRight,
  UserCog,
  Users2,
  Ticket,
  Home,
  Receipt,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default async function DashboardPage() {
  const user = await requireUser();
  const [overview, activity, orgContext, pipeline, tickets, property, finance] = await Promise.all([
    getOrgOverview(),
    getRecentActivity(6),
    getMyOrgContext(),
    getMyPipelineSnapshot(),
    getMyTicketSnapshot(),
    getPropertySnapshot(),
    getFinanceSnapshot(),
  ]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const hasOperationalCards = pipeline || tickets || property || finance;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">
          {greeting}, {user.role.name}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {user.department && <span>{user.department.name}</span>}
          {user.businessUnit && (
            <>
              <span>&middot;</span>
              <span>{user.businessUnit.name}</span>
            </>
          )}
        </div>
      </div>

      {hasOperationalCards && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pipeline && (
            <Link href="/leads">
              <Card className="transition-colors hover:border-primary/50">
                <CardContent className="flex items-start justify-between gap-3 pt-5">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">{pipeline.scopedToSelf ? "My pipeline" : "Sales pipeline"}</p>
                    <p className="text-2xl font-semibold tracking-tight">{pipeline.active}</p>
                    <p className="text-xs text-muted-foreground">
                      active &middot; {pipeline.won} won &middot; {pipeline.lost} lost
                    </p>
                  </div>
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Users2 className="size-4.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
          {tickets && (
            <Link href="/tickets">
              <Card className="transition-colors hover:border-primary/50">
                <CardContent className="flex items-start justify-between gap-3 pt-5">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">{tickets.scopedToSelf ? "My open tickets" : "Open tickets"}</p>
                    <p className="text-2xl font-semibold tracking-tight">{tickets.open}</p>
                    <p className="text-xs text-muted-foreground">{tickets.breached > 0 ? `${tickets.breached} SLA breached` : "none breached"}</p>
                  </div>
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-md ${tickets.breached > 0 ? "bg-destructive/10 text-destructive" : "bg-info-muted text-info"}`}>
                    <Ticket className="size-4.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
          {property && (
            <Link href="/properties">
              <Card className="transition-colors hover:border-primary/50">
                <CardContent className="flex items-start justify-between gap-3 pt-5">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Occupancy</p>
                    <p className="text-2xl font-semibold tracking-tight">{property.occupancyRate}%</p>
                    <p className="text-xs text-muted-foreground">
                      {property.occupied}/{property.total} units &middot; {property.openMaintenance} open job cards
                    </p>
                  </div>
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-success-muted text-success">
                    <Home className="size-4.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
          {finance && (
            <Link href="/finance">
              <Card className="transition-colors hover:border-primary/50">
                <CardContent className="flex items-start justify-between gap-3 pt-5">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Outstanding</p>
                    <p className="text-2xl font-semibold tracking-tight">{formatCurrency(finance.outstanding)}</p>
                    <p className="text-xs text-muted-foreground">{finance.overdueCount} overdue invoice(s)</p>
                  </div>
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-warning-muted text-warning">
                    <Receipt className="size-4.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      )}

      {overview && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Active users" value={overview.activeUsers} icon={Users} hint={`${overview.totalUsers} total accounts`} />
          <StatCard label="Departments" value={overview.departments} icon={Building2} tone="info" />
          <StatCard label="Business units" value={overview.businessUnits} icon={Landmark} tone="success" />
          <StatCard label="Configured roles" value={overview.roles} icon={ShieldCheck} tone="warning" />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {overview && (
          <>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Staff by business unit</CardTitle>
                <CardDescription>Active user accounts across MRE, MSL, MIA, MHL and MGC.</CardDescription>
              </CardHeader>
              <CardContent>
                <BusinessUnitChart data={overview.usersByBusinessUnit} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Staff by role</CardTitle>
                <CardDescription>Roles currently assigned to users.</CardDescription>
              </CardHeader>
              <CardContent>
                <RoleDistributionChart data={overview.usersByRole} />
              </CardContent>
            </Card>
          </>
        )}

        <Card className={overview ? "lg:col-span-2" : "lg:col-span-2"}>
          <CardHeader>
            <CardTitle>{activity.orgWide ? "Recent system activity" : "Your recent activity"}</CardTitle>
            <CardDescription>
              {activity.orgWide ? "The latest actions recorded across the CRM." : "Actions you've taken recently."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activity.entries.length === 0 ? (
              <EmptyState icon={ClipboardList} title="No activity yet" className="border-none py-8" />
            ) : (
              <ul className="space-y-4">
                {activity.entries.map((entry) => (
                  <li key={entry.id} className="flex items-start gap-3 text-sm">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground">
                        <span className="font-medium">{entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : "System"}</span>{" "}
                        <span className="text-muted-foreground">{entry.action.replace(/[._]/g, " ")}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.entityType} &middot; {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {hasPermission(user, "audit_logs.view") && (
              <Button asChild variant="link" className="mt-2 h-auto p-0">
                <Link href="/admin/audit-log">
                  View full audit log <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your workspace</CardTitle>
            <CardDescription>Reporting line and access summary.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row icon={UserCog} label="Reports to" value={orgContext.manager ? `${orgContext.manager.firstName} ${orgContext.manager.lastName}` : "—"} />
            <Row icon={Users} label="Direct reports" value={String(orgContext.directReportsCount)} />
            <Row icon={ShieldCheck} label="Permissions granted" value={String(orgContext.permissionCount)} />
            <Row icon={Bell} label="Unread notifications" value={String(orgContext.unreadNotifications)} />

            <Button asChild variant="outline" size="sm" className="mt-2 w-full">
              <Link href="/profile">View full profile</Link>
            </Button>

            {hasPermission(user, "users.manage") && (
              <div className="flex flex-col gap-2 border-t border-border pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick actions</p>
                <Button asChild size="sm" variant="secondary">
                  <Link href="/admin/users">
                    <Users className="size-3.5" /> Manage users
                  </Link>
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <Link href="/admin/roles">
                    <ShieldCheck className="size-3.5" /> Roles & permissions
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" /> {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
