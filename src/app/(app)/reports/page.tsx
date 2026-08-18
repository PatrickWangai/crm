import { requireAnyPermissionOrRedirect } from "@/lib/rbac/guard";
import {
  getFinanceReport,
  getLeadPipelineReport,
  getLeadSourceReport,
  getMaintenanceReport,
  getOccupancyReport,
  getTaskReport,
  getTicketSlaReport,
} from "@/lib/services/report.service";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FunnelChart, DistributionBarChart, StatusPieChart } from "@/components/reports/report-charts";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, Ticket, Home, Receipt, Wrench, CheckSquare, Target, Percent } from "lucide-react";

function labelize(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function ReportsPage() {
  await requireAnyPermissionOrRedirect(["reports.view"]);

  const [pipeline, sources, ticketSla, occupancy, finance, maintenance, tasks] = await Promise.all([
    getLeadPipelineReport(),
    getLeadSourceReport(),
    getTicketSlaReport(),
    getOccupancyReport(),
    getFinanceReport(),
    getMaintenanceReport(),
    getTaskReport(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader title="Reports & Analytics" description="Portfolio-wide performance across sales, service, property and finance." />

      {/* Sales pipeline */}
      <section className="space-y-4">
        <SectionHeading icon={TrendingUp} title="Sales Pipeline" />
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total leads" value={pipeline.total} icon={Target} />
          <StatCard label="Closed won" value={pipeline.won} icon={Target} tone="success" />
          <StatCard label="Win rate" value={`${pipeline.winRate}%`} icon={Percent} tone="info" hint={`${pipeline.won} won of ${pipeline.won + pipeline.lost} closed`} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline by stage</CardTitle>
              <CardDescription>Current lead count at each stage.</CardDescription>
            </CardHeader>
            <CardContent>
              <FunnelChart data={pipeline.funnel.map((f) => ({ label: labelize(f.status), count: f.count }))} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Lead source performance</CardTitle>
              <CardDescription>Volume and conversion rate by acquisition channel.</CardDescription>
            </CardHeader>
            <CardContent>
              {sources.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No leads captured yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead>Leads</TableHead>
                      <TableHead>Won</TableHead>
                      <TableHead>Conversion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sources.map((s) => (
                      <TableRow key={s.source}>
                        <TableCell className="text-sm font-medium">{labelize(s.source)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{s.count}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{s.won}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{s.conversionRate}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Customer service */}
      <section className="space-y-4">
        <SectionHeading icon={Ticket} title="Customer Service" />
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="SLA compliance" value={ticketSla.compliance !== null ? `${ticketSla.compliance}%` : "—"} icon={Percent} tone="success" hint={`${ticketSla.onTime} resolved on time, ${ticketSla.late} late`} />
          <StatCard label="Currently breached" value={ticketSla.openBreached} icon={Ticket} tone="destructive" hint="Open tickets past their SLA deadline" />
          <StatCard label="Resolved tickets" value={ticketSla.onTime + ticketSla.late} icon={CheckSquare} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Open &amp; resolved tickets by priority</CardTitle>
          </CardHeader>
          <CardContent>
            {ticketSla.byPriority.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No tickets logged yet.</p>
            ) : (
              <DistributionBarChart data={ticketSla.byPriority.map((p) => ({ label: labelize(p.priority), count: p.count }))} name="Tickets" />
            )}
          </CardContent>
        </Card>
      </section>

      {/* Property */}
      <section className="space-y-4">
        <SectionHeading icon={Home} title="Property Portfolio" />
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total units" value={occupancy.total} icon={Home} />
          <StatCard label="Occupied" value={occupancy.occupied} icon={Home} tone="success" />
          <StatCard label="Occupancy rate" value={`${occupancy.occupancyRate}%`} icon={Percent} tone="info" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Units by status</CardTitle>
          </CardHeader>
          <CardContent>
            {occupancy.total === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No units on the portfolio yet.</p>
            ) : (
              <StatusPieChart data={occupancy.byStatus.map((s) => ({ label: labelize(s.status), count: s.count }))} />
            )}
          </CardContent>
        </Card>
      </section>

      {/* Finance */}
      <section className="space-y-4">
        <SectionHeading icon={Receipt} title="Finance" />
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard label="Total invoiced" value={formatCurrency(finance.totalInvoiced)} icon={Receipt} />
          <StatCard label="Total collected" value={formatCurrency(finance.totalCollected)} icon={Receipt} tone="success" />
          <StatCard label="Outstanding" value={formatCurrency(finance.outstanding)} icon={Receipt} tone="warning" />
          <StatCard label="Overdue invoices" value={finance.overdueCount} icon={Receipt} tone="destructive" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Invoices by status</CardTitle>
          </CardHeader>
          <CardContent>
            {finance.byStatus.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No invoices raised yet.</p>
            ) : (
              <DistributionBarChart data={finance.byStatus.map((s) => ({ label: labelize(s.status), count: s.count }))} name="Invoices" />
            )}
          </CardContent>
        </Card>
      </section>

      {/* Operations */}
      <section className="space-y-4">
        <SectionHeading icon={Wrench} title="Operations" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance job cards</CardTitle>
              <CardDescription>{maintenance.avgCompletionDays !== null ? `Average completion time: ${maintenance.avgCompletionDays} day(s)` : "No completed job cards yet."}</CardDescription>
            </CardHeader>
            <CardContent>
              {maintenance.byStatus.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No job cards logged yet.</p>
              ) : (
                <DistributionBarChart data={maintenance.byStatus.map((s) => ({ label: labelize(s.status), count: s.count }))} name="Job cards" />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Task completion</CardTitle>
              <CardDescription>Follow-ups and action items across the organization.</CardDescription>
            </CardHeader>
            <CardContent>
              {tasks.byStatus.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No tasks created yet.</p>
              ) : (
                <DistributionBarChart data={tasks.byStatus.map((s) => ({ label: labelize(s.status), count: s.count }))} name="Tasks" />
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function SectionHeading({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4.5 text-primary" />
      <h2 className="text-base font-semibold">{title}</h2>
    </div>
  );
}
