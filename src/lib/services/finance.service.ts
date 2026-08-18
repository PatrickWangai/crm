import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { InvoiceStatus } from "@prisma/client";
import { requireAnyPermission, hasPermission } from "@/lib/rbac/guard";
import { recordAudit } from "@/lib/audit/log";
import { createNotification } from "@/lib/services/notification.service";
import type { DisbursementInput, InvoiceInput, PaymentInput } from "@/lib/validation/finance";

function cleanId(value?: string | null): string | null {
  return value && value.length > 0 ? value : null;
}

function cleanStr(value?: string | null): string | undefined {
  return value && value.length > 0 ? value : undefined;
}

async function nextInvoiceNumber(): Promise<string> {
  const count = await prisma.invoice.count();
  return `INV-${String(count + 1).padStart(6, "0")}`;
}

async function nextReceiptNumber(): Promise<string> {
  const count = await prisma.payment.count();
  return `RCT-${String(count + 1).padStart(6, "0")}`;
}

async function nextDisbursementCode(): Promise<string> {
  const count = await prisma.disbursement.count();
  return `DSB-${String(count + 1).padStart(6, "0")}`;
}

export interface ListInvoicesParams {
  q?: string;
  status?: InvoiceStatus;
  page?: number;
  pageSize?: number;
}

export async function listInvoices(params: ListInvoicesParams = {}) {
  await requireAnyPermission(["finance.view"]);

  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 20;

  const where = {
    AND: [
      params.q
        ? {
            OR: [
              { invoiceNumber: { contains: params.q, mode: "insensitive" as const } },
              { stakeholder: { firstName: { contains: params.q, mode: "insensitive" as const } } },
              { stakeholder: { lastName: { contains: params.q, mode: "insensitive" as const } } },
            ],
          }
        : {},
      params.status ? { status: params.status } : {},
    ],
  };

  const [data, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        stakeholder: { select: { id: true, firstName: true, lastName: true, code: true } },
        lease: { select: { id: true, code: true } },
        payments: true,
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.invoice.count({ where }),
  ]);

  return { data, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

/**
 * Invoices above finance.manage but below finance.approve go out as DRAFT
 * and need sign-off before they're SENT — a lightweight approval workflow
 * built on the existing (previously unused) DRAFT status rather than a new
 * model, since Invoice already has everything else this needs. Holders of
 * finance.approve (CFO/CEO) can self-approve, so their invoices go straight
 * to SENT.
 */
export async function createInvoice(input: InvoiceInput) {
  const actor = await requireAnyPermission(["finance.manage"]);
  const invoiceNumber = await nextInvoiceNumber();
  const needsApproval = !hasPermission(actor, "finance.approve");

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      stakeholderId: input.stakeholderId,
      leaseId: cleanId(input.leaseId) ?? undefined,
      businessUnitId: cleanId(input.businessUnitId) ?? undefined,
      amount: input.amount,
      dueDate: new Date(input.dueDate),
      status: needsApproval ? "DRAFT" : "SENT",
      createdById: actor.id,
    },
  });

  await recordAudit({ userId: actor.id, action: "invoice.created", entityType: "Invoice", entityId: invoice.id, newValue: { amount: input.amount, needsApproval } });

  if (needsApproval) {
    const approvers = await prisma.user.findMany({
      where: { status: "ACTIVE", role: { rolePermissions: { some: { permission: { code: "finance.approve" } } } } },
      select: { id: true },
    });
    for (const approver of approvers) {
      await createNotification({
        userId: approver.id,
        type: "APPROVAL",
        title: "Invoice awaiting approval",
        message: `${invoice.invoiceNumber}: ${input.amount.toLocaleString("en-KE")} — submitted by ${actor.firstName} ${actor.lastName}`,
        relatedUrl: "/finance",
      });
    }
  }

  return invoice;
}

export async function approveInvoice(id: string) {
  const actor = await requireAnyPermission(["finance.approve"]);
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id } });
  if (invoice.status !== "DRAFT") throw new Error("Only invoices pending approval can be approved.");

  const updated = await prisma.invoice.update({
    where: { id },
    data: { status: "SENT", approvedById: actor.id, approvedAt: new Date() },
  });

  await recordAudit({ userId: actor.id, action: "invoice.approved", entityType: "Invoice", entityId: id, newValue: { status: "SENT" } });

  if (invoice.createdById && invoice.createdById !== actor.id) {
    await createNotification({
      userId: invoice.createdById,
      type: "APPROVAL",
      title: "Invoice approved",
      message: `${invoice.invoiceNumber} was approved and sent.`,
      relatedUrl: "/finance",
    });
  }

  return updated;
}

export async function rejectInvoice(id: string) {
  const actor = await requireAnyPermission(["finance.approve"]);
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id } });
  if (invoice.status !== "DRAFT") throw new Error("Only invoices pending approval can be rejected.");

  const updated = await prisma.invoice.update({
    where: { id },
    data: { status: "CANCELLED", approvedById: actor.id, approvedAt: new Date() },
  });

  await recordAudit({ userId: actor.id, action: "invoice.rejected", entityType: "Invoice", entityId: id, newValue: { status: "CANCELLED" } });

  if (invoice.createdById && invoice.createdById !== actor.id) {
    await createNotification({
      userId: invoice.createdById,
      type: "APPROVAL",
      title: "Invoice rejected",
      message: `${invoice.invoiceNumber} was not approved.`,
      relatedUrl: "/finance",
    });
  }

  return updated;
}

export async function recordPayment(invoiceId: string, input: PaymentInput) {
  const actor = await requireAnyPermission(["finance.manage"]);
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { payments: true } });
  const receiptNumber = await nextReceiptNumber();

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        invoiceId,
        receiptNumber,
        amount: input.amount,
        method: input.method,
        reference: input.reference || undefined,
        recordedById: actor.id,
      },
    });

    const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0) + input.amount;
    const status: InvoiceStatus = totalPaid >= Number(invoice.amount) ? "PAID" : totalPaid > 0 ? "PARTIALLY_PAID" : invoice.status;
    await tx.invoice.update({ where: { id: invoiceId }, data: { status } });

    return created;
  });

  await recordAudit({ userId: actor.id, action: "payment.recorded", entityType: "Invoice", entityId: invoiceId, newValue: { amount: input.amount, method: input.method, receiptNumber } });

  return payment;
}

export interface ListPaymentsParams {
  q?: string;
  reconciled?: boolean;
  page?: number;
  pageSize?: number;
}

/** Flat payments list — for the reconciliation view (receipts aren't otherwise browsable outside their invoice). */
export async function listPayments(params: ListPaymentsParams = {}) {
  await requireAnyPermission(["finance.view"]);

  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 20;

  const where = {
    AND: [
      params.q
        ? {
            OR: [
              { receiptNumber: { contains: params.q, mode: "insensitive" as const } },
              { reference: { contains: params.q, mode: "insensitive" as const } },
              { invoice: { invoiceNumber: { contains: params.q, mode: "insensitive" as const } } },
            ],
          }
        : {},
      params.reconciled !== undefined ? { isReconciled: params.reconciled } : {},
    ],
  };

  const [data, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        invoice: { select: { id: true, invoiceNumber: true, stakeholder: { select: { firstName: true, lastName: true } } } },
        recordedBy: { select: { firstName: true, lastName: true } },
        reconciledBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { paidAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.payment.count({ where }),
  ]);

  return { data, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getPaymentReceipt(id: string) {
  await requireAnyPermission(["finance.view"]);
  return prisma.payment.findUnique({
    where: { id },
    include: {
      invoice: { include: { stakeholder: true, lease: { select: { code: true } } } },
      recordedBy: { select: { firstName: true, lastName: true } },
    },
  });
}

export async function toggleReconcilePayment(id: string) {
  const actor = await requireAnyPermission(["finance.manage"]);
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id } });

  const updated = await prisma.payment.update({
    where: { id },
    data: payment.isReconciled
      ? { isReconciled: false, reconciledAt: null, reconciledById: null }
      : { isReconciled: true, reconciledAt: new Date(), reconciledById: actor.id },
  });

  await recordAudit({
    userId: actor.id,
    action: updated.isReconciled ? "payment.reconciled" : "payment.unreconciled",
    entityType: "Payment",
    entityId: id,
  });

  return updated;
}

/** Overdue invoices grouped by stakeholder, with days overdue — the arrears view. */
export async function getArrearsReport() {
  await requireAnyPermission(["finance.view"]);

  const overdue = await prisma.invoice.findMany({
    where: { status: { in: ["SENT", "PARTIALLY_PAID"] }, dueDate: { lt: new Date() } },
    include: { stakeholder: { select: { id: true, firstName: true, lastName: true, code: true } }, payments: true },
    orderBy: { dueDate: "asc" },
  });

  const now = Date.now();
  const rows = overdue.map((invoice) => {
    const paid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balance = Number(invoice.amount) - paid;
    const daysOverdue = Math.floor((now - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      stakeholder: invoice.stakeholder,
      dueDate: invoice.dueDate,
      balance,
      daysOverdue,
    };
  });

  const totalArrears = rows.reduce((sum, r) => sum + r.balance, 0);

  return { rows, totalArrears, count: rows.length };
}

export async function listDisbursements() {
  await requireAnyPermission(["finance.view"]);
  return prisma.disbursement.findMany({
    include: {
      landlord: { select: { id: true, firstName: true, lastName: true, code: true } },
      property: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createDisbursement(input: DisbursementInput) {
  const actor = await requireAnyPermission(["finance.manage"]);
  const code = await nextDisbursementCode();

  const disbursement = await prisma.disbursement.create({
    data: {
      code,
      landlordId: input.landlordId,
      propertyId: cleanId(input.propertyId) ?? undefined,
      periodLabel: input.periodLabel,
      amount: input.amount,
      notes: cleanStr(input.notes),
      createdById: actor.id,
    },
  });

  await recordAudit({ userId: actor.id, action: "disbursement.created", entityType: "Disbursement", entityId: disbursement.id, newValue: { amount: input.amount } });

  return disbursement;
}

export async function markDisbursementPaid(id: string) {
  const actor = await requireAnyPermission(["finance.manage"]);
  const disbursement = await prisma.disbursement.update({ where: { id }, data: { status: "PAID", paidAt: new Date() } });

  await recordAudit({ userId: actor.id, action: "disbursement.paid", entityType: "Disbursement", entityId: id });

  await createNotification({
    userId: disbursement.createdById ?? actor.id,
    type: "SYSTEM",
    title: "Landlord disbursement paid",
    message: `${disbursement.code} for ${disbursement.periodLabel} marked as paid.`,
    relatedUrl: "/finance",
  });

  return disbursement;
}
