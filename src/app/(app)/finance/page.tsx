import { requireAnyPermissionOrRedirect, hasPermission } from "@/lib/rbac/guard";
import { listInvoices } from "@/lib/services/finance.service";
import { listBusinessUnitOptions, listLeaseOptions, listStakeholderOptions } from "@/lib/services/lookups.service";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/status-badge";
import { InvoiceFormSheet } from "@/components/finance/invoice-form-sheet";
import { RecordPaymentDialog } from "@/components/finance/record-payment-dialog";
import { ApproveInvoiceButtons } from "@/components/finance/approve-invoice-buttons";
import { formatCurrency } from "@/lib/utils";
import { Receipt } from "lucide-react";

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAnyPermissionOrRedirect(["finance.view"]);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const page = typeof sp.page === "string" ? Number(sp.page) || 1 : 1;

  const [{ data: invoices, total, pageCount }, stakeholders, leases, businessUnits] = await Promise.all([
    listInvoices({ q, page }),
    listStakeholderOptions(),
    listLeaseOptions(),
    listBusinessUnitOptions(),
  ]);
  const canManage = hasPermission(user, "finance.manage");
  const canApprove = hasPermission(user, "finance.approve");

  return (
    <div>
      <PageHeader
        title="Finance"
        description="Invoices and payments across stakeholders and leases."
        actions={canManage ? <InvoiceFormSheet stakeholders={stakeholders} leases={leases} businessUnits={businessUnits} /> : undefined}
      />

      <div className="rounded-lg border border-border bg-card p-4">
        {invoices.length === 0 ? (
          <EmptyState icon={Receipt} title="No invoices yet" description="Create an invoice to start tracking billing." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Stakeholder</TableHead>
                  <TableHead>Lease</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Submitted by</TableHead>
                  <TableHead>Status</TableHead>
                  {(canManage || canApprove) && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => {
                  const paid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
                  const balance = Number(invoice.amount) - paid;
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="text-sm font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {invoice.stakeholder.firstName} {invoice.stakeholder.lastName}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{invoice.lease?.code ?? "—"}</TableCell>
                      <TableCell className="text-sm font-medium">{formatCurrency(Number(invoice.amount))}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {invoice.createdBy ? `${invoice.createdBy.firstName} ${invoice.createdBy.lastName}` : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={invoice.status} />
                      </TableCell>
                      {(canManage || canApprove) && (
                        <TableCell className="text-right">
                          {invoice.status === "DRAFT" && canApprove ? (
                            <ApproveInvoiceButtons invoiceId={invoice.id} />
                          ) : (
                            canManage &&
                            balance > 0 &&
                            invoice.status !== "DRAFT" && <RecordPaymentDialog invoiceId={invoice.id} invoiceNumber={invoice.invoiceNumber} balance={balance} />
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Pagination page={page} pageCount={pageCount} total={total} />
          </>
        )}
      </div>
    </div>
  );
}
