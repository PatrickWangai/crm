import { notFound } from "next/navigation";
import { getPaymentReceipt } from "@/lib/services/finance.service";
import { getSettingValue } from "@/lib/services/settings.service";
import { formatCurrency } from "@/lib/utils";
import { PrintReceiptButton } from "@/components/finance/print-receipt-button";

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  MPESA: "M-Pesa",
  CARD: "Card",
  CHEQUE: "Cheque",
  OTHER: "Other",
};

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [payment, companyName] = await Promise.all([getPaymentReceipt(id), getSettingValue("companyName")]);
  if (!payment) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-6 print:max-w-none">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-lg font-semibold">Payment Receipt</h1>
        <PrintReceiptButton />
      </div>

      <div className="rounded-lg border border-border bg-card p-8 print:border-none print:p-0">
        <div className="mb-6 flex items-start justify-between border-b border-border pb-6">
          <div>
            <p className="text-lg font-bold">{companyName}</p>
            <p className="text-sm text-muted-foreground">Official Payment Receipt</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{payment.receiptNumber}</p>
            <p className="text-xs text-muted-foreground">{new Date(payment.paidAt).toLocaleString("en-KE")}</p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Received from</p>
            <p className="font-medium">
              {payment.invoice.stakeholder.firstName} {payment.invoice.stakeholder.lastName}
            </p>
            <p className="text-muted-foreground">{payment.invoice.stakeholder.code}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Against invoice</p>
            <p className="font-medium">{payment.invoice.invoiceNumber}</p>
            {payment.invoice.lease && <p className="text-muted-foreground">Lease {payment.invoice.lease.code}</p>}
          </div>
        </div>

        <div className="mb-6 space-y-2 rounded-md border border-border p-4 text-sm">
          <Row label="Amount paid" value={formatCurrency(Number(payment.amount))} bold />
          <Row label="Payment method" value={METHOD_LABELS[payment.method] ?? payment.method} />
          <Row label="Reference" value={payment.reference ?? "—"} />
          <Row label="Recorded by" value={payment.recordedBy ? `${payment.recordedBy.firstName} ${payment.recordedBy.lastName}` : "—"} />
          <Row label="Reconciled" value={payment.isReconciled ? "Yes" : "Not yet reconciled"} />
        </div>

        <p className="text-center text-xs text-muted-foreground">This is a system-generated receipt from the Masterways CRM.</p>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "text-base font-semibold" : "font-medium"}>{value}</span>
    </div>
  );
}
