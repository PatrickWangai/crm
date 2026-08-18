import Link from "next/link";
import { requireAnyPermissionOrRedirect, hasPermission } from "@/lib/rbac/guard";
import { getArrearsReport, listDisbursements, listInvoices, listPayments } from "@/lib/services/finance.service";
import { listBusinessUnitOptions, listLeaseOptions, listPropertyOptions, listStakeholderOptions } from "@/lib/services/lookups.service";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/status-badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvoiceFormSheet } from "@/components/finance/invoice-form-sheet";
import { RecordPaymentDialog } from "@/components/finance/record-payment-dialog";
import { ApproveInvoiceButtons } from "@/components/finance/approve-invoice-buttons";
import { ReconcileToggle } from "@/components/finance/reconcile-toggle";
import { DisbursementFormSheet } from "@/components/finance/disbursement-form-sheet";
import { MarkDisbursementPaidButton } from "@/components/finance/mark-disbursement-paid-button";
import { formatCurrency } from "@/lib/utils";
import { Receipt, AlertTriangle, Landmark, FileText } from "lucide-react";

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAnyPermissionOrRedirect(["finance.view"]);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const page = typeof sp.page === "string" ? Number(sp.page) || 1 : 1;

  const [{ data: invoices, total, pageCount }, stakeholders, leases, businessUnits, properties] = await Promise.all([
    listInvoices({ q, page }),
    listStakeholderOptions(),
    listLeaseOptions(),
    listBusinessUnitOptions(),
    listPropertyOptions(),
  ]);
  const canManage = hasPermission(user, "finance.manage");
  const canApprove = hasPermission(user, "finance.approve");

  return (
    <div>
      <PageHeader
        title="Finance"
        description="Invoices, payments, arrears and landlord disbursements."
        actions={canManage ? <InvoiceFormSheet stakeholders={stakeholders} leases={leases} businessUnits={businessUnits} /> : undefined}
      />

      <Tabs defaultValue="invoices">
        <TabsList className="flex-wrap">
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="arrears">Arrears</TabsTrigger>
          <TabsTrigger value="disbursements">Disbursements</TabsTrigger>
        </TabsList>

        {/* Invoices */}
        <TabsContent value="invoices">
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
                                invoice.status !== "DRAFT" && (
                                  <RecordPaymentDialog invoiceId={invoice.id} invoiceNumber={invoice.invoiceNumber} balance={balance} />
                                )
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
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments">
          <PaymentsTab />
        </TabsContent>

        {/* Arrears */}
        <TabsContent value="arrears">
          <ArrearsTab />
        </TabsContent>

        {/* Disbursements */}
        <TabsContent value="disbursements">
          <DisbursementsTab canManage={canManage} landlords={stakeholders} properties={properties} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

async function PaymentsTab() {
  const { data: payments, total } = await listPayments({ pageSize: 50 });

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="mb-3 text-xs text-muted-foreground">{total} payment(s) recorded</p>
      {payments.length === 0 ? (
        <EmptyState icon={FileText} title="No payments recorded yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Stakeholder</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Recorded by</TableHead>
              <TableHead>Reconciled</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="text-sm font-medium">{payment.receiptNumber}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{payment.invoice.invoiceNumber}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {payment.invoice.stakeholder.firstName} {payment.invoice.stakeholder.lastName}
                </TableCell>
                <TableCell className="text-sm font-medium">{formatCurrency(Number(payment.amount))}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{payment.method.replace(/_/g, " ")}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {payment.recordedBy ? `${payment.recordedBy.firstName} ${payment.recordedBy.lastName}` : "—"}
                </TableCell>
                <TableCell>
                  <ReconcileToggle paymentId={payment.id} isReconciled={payment.isReconciled} />
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/finance/receipts/${payment.id}`} className="text-sm text-primary hover:underline">
                    View receipt
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

async function ArrearsTab() {
  const { rows, totalArrears, count } = await getArrearsReport();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Total arrears" value={formatCurrency(totalArrears)} icon={AlertTriangle} tone="destructive" />
        <StatCard label="Overdue invoices" value={count} icon={Receipt} tone="warning" />
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        {rows.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="No arrears" description="Every invoice is either paid or not yet due." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Stakeholder</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Days overdue</TableHead>
                <TableHead>Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.invoiceId}>
                  <TableCell className="text-sm font-medium">{row.invoiceNumber}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.stakeholder.firstName} {row.stakeholder.lastName}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(row.dueDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <span className={row.daysOverdue > 30 ? "font-medium text-destructive" : "text-warning"}>{row.daysOverdue} days</span>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{formatCurrency(row.balance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

async function DisbursementsTab({
  canManage,
  landlords,
  properties,
}: {
  canManage: boolean;
  landlords: Awaited<ReturnType<typeof listStakeholderOptions>>;
  properties: Awaited<ReturnType<typeof listPropertyOptions>>;
}) {
  const disbursements = await listDisbursements();

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <DisbursementFormSheet landlords={landlords} properties={properties} />
        </div>
      )}
      <div className="rounded-lg border border-border bg-card p-4">
        {disbursements.length === 0 ? (
          <EmptyState icon={Landmark} title="No disbursements yet" description="Record rent collected on a landlord's behalf." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Disbursement</TableHead>
                <TableHead>Landlord</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {disbursements.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="text-sm font-medium">{d.code}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {d.landlord.firstName} {d.landlord.lastName}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.property?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.periodLabel}</TableCell>
                  <TableCell className="text-sm font-medium">{formatCurrency(Number(d.amount))}</TableCell>
                  <TableCell>
                    <StatusBadge status={d.status} />
                  </TableCell>
                  {canManage && <TableCell className="text-right">{d.status === "DRAFT" && <MarkDisbursementPaidButton disbursementId={d.id} />}</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
