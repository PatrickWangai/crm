"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rowsToCsv, downloadTextFile } from "@/lib/csv";
import { labelize } from "@/lib/utils";
import type {
  getFinanceReport,
  getLeadPipelineReport,
  getLeadSourceReport,
  getMaintenanceReport,
  getOccupancyReport,
  getTaskReport,
  getTicketSlaReport,
} from "@/lib/services/report.service";

export function ExportReportButton({
  pipeline,
  sources,
  ticketSla,
  occupancy,
  finance,
  maintenance,
  tasks,
}: {
  pipeline: Awaited<ReturnType<typeof getLeadPipelineReport>>;
  sources: Awaited<ReturnType<typeof getLeadSourceReport>>;
  ticketSla: Awaited<ReturnType<typeof getTicketSlaReport>>;
  occupancy: Awaited<ReturnType<typeof getOccupancyReport>>;
  finance: Awaited<ReturnType<typeof getFinanceReport>>;
  maintenance: Awaited<ReturnType<typeof getMaintenanceReport>>;
  tasks: Awaited<ReturnType<typeof getTaskReport>>;
}) {
  function handleExport() {
    const rows: (string | number)[][] = [];

    rows.push(["Masterways CRM — Reports & Analytics"]);
    rows.push([`Generated: ${new Date().toLocaleString("en-KE")}`]);
    rows.push([]);

    rows.push(["Sales Pipeline"]);
    rows.push(["Total leads", pipeline.total]);
    rows.push(["Closed won", pipeline.won]);
    rows.push(["Closed lost", pipeline.lost]);
    rows.push(["Win rate", `${pipeline.winRate}%`]);
    rows.push([]);
    rows.push(["Stage", "Count"]);
    for (const f of pipeline.funnel) rows.push([labelize(f.status), f.count]);
    rows.push([]);

    rows.push(["Lead Source Performance"]);
    rows.push(["Source", "Leads", "Won", "Conversion"]);
    for (const s of sources) rows.push([labelize(s.source), s.count, s.won, `${s.conversionRate}%`]);
    rows.push([]);

    rows.push(["Customer Service"]);
    rows.push(["SLA compliance", ticketSla.compliance !== null ? `${ticketSla.compliance}%` : "N/A"]);
    rows.push(["Resolved on time", ticketSla.onTime]);
    rows.push(["Resolved late", ticketSla.late]);
    rows.push(["Currently breached (open)", ticketSla.openBreached]);
    rows.push([]);
    rows.push(["Priority", "Count"]);
    for (const p of ticketSla.byPriority) rows.push([labelize(p.priority), p.count]);
    rows.push([]);

    rows.push(["Property Portfolio"]);
    rows.push(["Total units", occupancy.total]);
    rows.push(["Occupied", occupancy.occupied]);
    rows.push(["Occupancy rate", `${occupancy.occupancyRate}%`]);
    rows.push([]);
    rows.push(["Unit status", "Count"]);
    for (const s of occupancy.byStatus) rows.push([labelize(s.status), s.count]);
    rows.push([]);

    rows.push(["Finance"]);
    rows.push(["Total invoiced", finance.totalInvoiced]);
    rows.push(["Total collected", finance.totalCollected]);
    rows.push(["Outstanding", finance.outstanding]);
    rows.push(["Overdue invoices", finance.overdueCount]);
    rows.push([]);
    rows.push(["Invoice status", "Count"]);
    for (const s of finance.byStatus) rows.push([labelize(s.status), s.count]);
    rows.push([]);

    rows.push(["Operations — Maintenance"]);
    rows.push(["Average completion (days)", maintenance.avgCompletionDays ?? "N/A"]);
    rows.push(["Status", "Count"]);
    for (const s of maintenance.byStatus) rows.push([labelize(s.status), s.count]);
    rows.push([]);

    rows.push(["Operations — Tasks"]);
    rows.push(["Status", "Count"]);
    for (const s of tasks.byStatus) rows.push([labelize(s.status), s.count]);

    downloadTextFile(`masterways-crm-report-${new Date().toISOString().slice(0, 10)}.csv`, rowsToCsv(rows));
  }

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="size-3.5" /> Export CSV
    </Button>
  );
}
