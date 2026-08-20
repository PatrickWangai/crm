import { requireAnyPermissionOrRedirect } from "@/lib/rbac/guard";
import {
  getComplaintsReport,
  getFinanceReport,
  getLeadPipelineReport,
  getLeadSourceReport,
  getLeaseExpiryReport,
  getMaintenanceReport,
  getMonthlyRevenueTrend,
  getOccupancyReport,
  getTaskReport,
  getTicketSlaReport,
  type ReportFilters,
} from "@/lib/services/report.service";
import { listBusinessUnitOptions, listDepartmentOptions, listPropertyRegions, listUserOptions } from "@/lib/services/lookups.service";
import { isAiAssistantEnabled, summarizeReportInsights } from "@/lib/services/ai.service";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FunnelChart, DistributionBarChart, StatusPieChart } from "@/components/reports/report-charts";
import { ExportReportButton } from "@/components/reports/export-report-button";
import { ReportFiltersBar } from "@/components/reports/report-filters-bar";
import { AiReportInsightsCard } from "@/components/ai/ai-report-insights-card";
import { formatCurrency, labelize } from "@/lib/utils";
import { TrendingUp, Ticket, Home, Receipt, Wrench, CheckSquare, Target, Percent, AlertTriangle, CalendarClock } from "lucide-react";
import type { TicketStatus } from "@prisma/client";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAnyPermissionOrRedirect(["reports.view"]);
  const sp = await searchParams;

  const rawDateFrom = typeof sp.dateFrom === "string" ? sp.dateFrom : undefined;
  const rawDateTo = typeof sp.dateTo === "string" ? sp.dateTo : undefined;
  const dateTo = rawDateTo ? new Date(`${rawDateTo}T23:59:59.999`) : undefined;

  const filters: ReportFilters = {
    dateFrom: rawDateFrom ? new Date(rawDateFrom) : undefined,
    dateTo,
    businessUnitId: typeof sp.businessUnitId === "string" && sp.businessUnitId ? sp.businessUnitId : undefined,
    departmentId: typeof sp.departmentId === "string" && sp.departmentId ? sp.departmentId : undefined,
    employeeId: typeof sp.employeeId === "string" && sp.employeeId ? sp.employeeId : undefined,
    region: typeof sp.region === "string" && sp.region ? sp.region : undefined,
    ticketStatus: typeof sp.status === "string" && sp.status ? (sp.status as TicketStatus) : undefined,
  };

  const [pipeline, sources, ticketSla, occupancy, finance, maintenance, tasks, monthlyRevenue, complaints, leaseExpiry, businessUnits, departments, staff, regions, aiEnabled] =
    await Promise.all([
      getLeadPipelineReport(filters),
      getLeadSourceReport(filters),
      getTicketSlaReport(filters),
      getOccupancyReport(filters),
      getFinanceReport(filters),
      getMaintenanceReport(filters),
      getTaskReport(filters),
      getMonthlyRevenueTrend(filters),
      getComplaintsReport(filters),
      getLeaseExpiryReport(filters),
      listBusinessUnitOptions(),
      listDepartmentOptions(),
      listUserOptions(),
      listPropertyRegions(),
      isAiAssistantEnabled(),
    ]);

  const aiInsights = aiEnabled ? summarizeReportInsights({ pipeline, ticketSla, occupancy, finance, maintenance, monthlyRevenue }) : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reports & Analytics"
        description="Portfolio-wide performance across sales, service, property and finance."
        actions={
          <ExportReportButton
            pipeline={pipeline}
            sources={sources}
            ticketSla={ticketSla}
            occupancy={occupancy}
            finance={finance}
            maintenance={maintenance}
            tasks={tasks}
            complaints={complaints}
            leaseExpiry={leaseExpiry}
          />
        }
      />

      <ReportFiltersBar businessUnits={businessUnits} departments={departments} staff={staff} regions={regions} />

      {aiInsights && <AiReportInsightsCard insights={aiInsights} />}

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

      {/* Customer complaints */}
      <section className="space-y-4">
        <SectionHeading icon={AlertTriangle} title="Customer Complaints" />
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total complaints" value={complaints.total} icon={AlertTriangle} />
          <StatCard
            label="Open complaints"
            value={complaints.byStatus.filter((s) => s.status !== "COMPLETED" && s.status !== "CLOSED").reduce((sum, s) => sum + s.count, 0)}
            icon={AlertTriangle}
            tone="warning"
          />
          <StatCard label="Avg. resolution time" value={complaints.avgResolutionDays !== null ? `${complaints.avgResolutionDays} day(s)` : "—"} icon={CheckSquare} tone="info" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Complaints by status</CardTitle>
            </CardHeader>
            <CardContent>
              {complaints.byStatus.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No complaints logged yet.</p>
              ) : (
                <DistributionBarChart data={complaints.byStatus.map((s) => ({ label: labelize(s.status), count: s.count }))} name="Complaints" />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Complaints by department</CardTitle>
            </CardHeader>
            <CardContent>
              {complaints.byDepartment.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No complaints logged yet.</p>
              ) : (
                <DistributionBarChart data={complaints.byDepartment.map((d) => ({ label: d.department, count: d.count }))} name="Complaints" />
              )}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Recent complaints</CardTitle>
          </CardHeader>
          <CardContent>
            {complaints.recent.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No complaints logged yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Logged</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complaints.recent.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm font-medium">
                        {c.ticketNumber} — {c.subject}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.stakeholderName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.department}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{labelize(c.priority)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{labelize(c.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.createdAt.toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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

      {/* Lease expiry */}
      <section className="space-y-4">
        <SectionHeading icon={CalendarClock} title="Lease Expiry" />
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard label="Expiring in 30 days" value={leaseExpiry.expiring30} icon={CalendarClock} tone="warning" />
          <StatCard label="Expiring in 60 days" value={leaseExpiry.expiring60} icon={CalendarClock} />
          <StatCard label="Expiring in 90 days" value={leaseExpiry.expiring90} icon={CalendarClock} />
          <StatCard label="Overdue renewal" value={leaseExpiry.overdue} icon={AlertTriangle} tone="destructive" hint="Still active, past their end date" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Leases by status</CardTitle>
            </CardHeader>
            <CardContent>
              {leaseExpiry.byStatus.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No leases on the portfolio yet.</p>
              ) : (
                <StatusPieChart data={leaseExpiry.byStatus.map((s) => ({ label: labelize(s.status), count: s.count }))} />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Upcoming expiries</CardTitle>
              <CardDescription>Active leases, soonest first.</CardDescription>
            </CardHeader>
            <CardContent>
              {leaseExpiry.upcoming.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No upcoming lease expiries in this window.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lease</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Ends</TableHead>
                      <TableHead>Days left</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaseExpiry.upcoming.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="text-sm font-medium">{l.code}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{l.tenantName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{l.unitLabel}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{l.endDate.toLocaleDateString()}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{l.daysRemaining < 0 ? `${Math.abs(l.daysRemaining)} overdue` : l.daysRemaining}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
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
