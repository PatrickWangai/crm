import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { InvoiceStatus } from "@prisma/client";
import { requireAnyPermission } from "@/lib/rbac/guard";
import { recordAudit } from "@/lib/audit/log";
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
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.invoice.count({ where }),
  ]);

  return { data, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function createInvoice(input: InvoiceInput) {
  const actor = await requireAnyPermission(["finance.manage"]);
  const invoiceNumber = await nextInvoiceNumber();

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      stakeholderId: input.stakeholderId,
      leaseId: cleanId(input.leaseId) ?? undefined,
      businessUnitId: cleanId(input.businessUnitId) ?? undefined,
      amount: input.amount,
      dueDate: new Date(input.dueDate),
      status: "SENT",
    },
  });

  await recordAudit({ userId: actor.id, action: "invoice.created", entityType: "Invoice", entityId: invoice.id, newValue: { amount: input.amount } });

  return invoice;
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
