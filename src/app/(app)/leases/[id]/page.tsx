import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { requireAnyPermissionOrRedirect, hasPermission } from "@/lib/rbac/guard";
import { getLeaseDetail } from "@/lib/services/lease.service";
import { uploadLeaseDocumentAction, deleteLeaseDocumentAction } from "@/app/(app)/leases/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeaseStatusControl } from "@/components/leases/lease-status-control";
import { LeaseInvoiceDialog } from "@/components/finance/lease-invoice-dialog";
import { RecordPaymentDialog } from "@/components/finance/record-payment-dialog";
import { ApproveInvoiceButtons } from "@/components/finance/approve-invoice-buttons";
import { UploadDocumentForm } from "@/components/documents/upload-document-form";
import { DeleteDocumentButton } from "@/components/documents/delete-document-button";
import { DocumentBadges } from "@/components/documents/document-badges";
import { formatCurrency } from "@/lib/utils";
import { FileSignature, Home, User as UserIcon, Calendar, Receipt, FileText, Download } from "lucide-react";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function LeaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAnyPermissionOrRedirect(["leases.view_all"]);
  const { id } = await params;

  const lease = await getLeaseDetail(id);
  if (!lease) notFound();

  const canManage = hasPermission(user, "leases.manage");
  const canManageFinance = hasPermission(user, "finance.manage");
  const canApproveFinance = hasPermission(user, "finance.approve");
  const canUpload = hasPermission(user, "documents.upload");
  const canDeleteDocs = hasPermission(user, "documents.delete");

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader title={lease.code} breadcrumbs={[{ label: "Leases", href: "/leases" }, { label: lease.code }]} />

      <Card>
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileSignature className="size-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">{lease.code}</h2>
                <StatusBadge status={lease.status} />
              </div>
              <Link href={`/units/${lease.unit.id}`} className="text-sm text-muted-foreground hover:text-primary hover:underline">
                {lease.unit.property.name} · Unit {lease.unit.unitNumber}
              </Link>
            </div>
          </div>
          {canManage && <LeaseStatusControl leaseId={lease.id} currentStatus={lease.status} />}
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Tenant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow icon={UserIcon} label="Name" value={`${lease.tenant.firstName} ${lease.tenant.lastName}`} />
              <InfoRow icon={UserIcon} label="Phone" value={lease.tenant.phone ?? "—"} />
              <InfoRow icon={UserIcon} label="Email" value={lease.tenant.email ?? "—"} />
              {lease.landlord && <InfoRow icon={Home} label="Landlord" value={`${lease.landlord.firstName} ${lease.landlord.lastName}`} />}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Term &amp; rent</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow icon={Calendar} label="Start" value={new Date(lease.startDate).toLocaleDateString()} />
              <InfoRow icon={Calendar} label="End" value={new Date(lease.endDate).toLocaleDateString()} />
              <InfoRow icon={Receipt} label="Rent" value={`${formatCurrency(Number(lease.rentAmount))}/mo`} />
              {lease.depositAmount && <InfoRow icon={Receipt} label="Deposit" value={formatCurrency(Number(lease.depositAmount))} />}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing */}
        <TabsContent value="billing">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Invoices &amp; payments</CardTitle>
                <CardDescription>Rent invoices raised against this lease and payments received.</CardDescription>
              </div>
              {canManageFinance && <LeaseInvoiceDialog leaseId={lease.id} stakeholderId={lease.tenant.id} defaultAmount={Number(lease.rentAmount)} />}
            </CardHeader>
            <CardContent>
              {lease.invoices.length === 0 ? (
                <EmptyState icon={Receipt} title="No invoices yet" className="border-none py-8" />
              ) : (
                <ul className="space-y-3">
                  {lease.invoices.map((invoice) => {
                    const paid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
                    const balance = Number(invoice.amount) - paid;
                    return (
                      <li key={invoice.id} className="rounded-md border border-border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{invoice.invoiceNumber}</p>
                            <p className="text-xs text-muted-foreground">Due {new Date(invoice.dueDate).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={invoice.status} />
                            <span className="text-sm font-medium">{formatCurrency(Number(invoice.amount))}</span>
                          </div>
                        </div>
                        {invoice.status === "DRAFT" && canApproveFinance && (
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Awaiting approval</span>
                            <ApproveInvoiceButtons invoiceId={invoice.id} />
                          </div>
                        )}
                        {balance > 0 && invoice.status !== "DRAFT" && canManageFinance && (
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Balance: {formatCurrency(balance)}</span>
                            <RecordPaymentDialog invoiceId={invoice.id} invoiceNumber={invoice.invoiceNumber} balance={balance} />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Tenancy agreements and correspondence for this lease.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {canUpload && <UploadDocumentForm action={uploadLeaseDocumentAction.bind(null, lease.id)} />}
              {lease.documents.length === 0 ? (
                <EmptyState icon={FileText} title="No documents uploaded yet" className="border-none py-8" />
              ) : (
                <ul className="divide-y divide-border">
                  {lease.documents.map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {doc.fileName} <DocumentBadges version={doc.version} accessLevel={doc.accessLevel} />
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatBytes(doc.fileSizeBytes)} &middot; uploaded {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                            {doc.uploadedBy && ` by ${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <a href={`/api/documents/${doc.id}`} target="_blank" rel="noopener noreferrer">
                          <button className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                            <Download className="size-4" />
                          </button>
                        </a>
                        {canDeleteDocs && (
                          <DeleteDocumentButton fileName={doc.fileName} deleteAction={deleteLeaseDocumentAction.bind(null, doc.id, lease.id)} />
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" /> {label}
      </span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}
