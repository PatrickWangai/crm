import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { InvoiceStatus } from "@prisma/client";
import { requireAnyPermission, hasPermission } from "@/lib/rbac/guard";
import { recordAudit } from "@/lib/audit/log";
import { createNotification } from "@/lib/services/notification.service";
import type { InvoiceInput, PaymentInput } from "@/lib/validation/finance";

function cleanId(value?: string | null): string | null {
  return value && value.length > 0 ? value : null;
}

async function nextInvoiceNumber(): Promise<string> {
  const count = await prisma.invoice.count();
  return `INV-${String(count + 1).padStart(6, "0")}`;
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

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        invoiceId,
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

  await recordAudit({ userId: actor.id, action: "payment.recorded", entityType: "Invoice", entityId: invoiceId, newValue: { amount: input.amount, method: input.method } });

  return payment;
}
