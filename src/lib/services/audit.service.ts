import "server-only";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/rbac/guard";

export interface ListAuditLogParams {
  q?: string;
  userId?: string;
  entityType?: string;
  page?: number;
  pageSize?: number;
}

export async function listAuditLog(params: ListAuditLogParams = {}) {
  await requirePermission("audit_logs.view");

  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 25;

  const where = {
    AND: [
      params.q
        ? {
            OR: [
              { action: { contains: params.q, mode: "insensitive" as const } },
              { entityType: { contains: params.q, mode: "insensitive" as const } },
            ],
          }
        : {},
      params.userId ? { userId: params.userId } : {},
      params.entityType ? { entityType: params.entityType } : {},
    ],
  };

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { data, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function listAuditEntityTypes() {
  await requirePermission("audit_logs.view");
  const rows = await prisma.auditLog.findMany({ distinct: ["entityType"], select: { entityType: true } });
  return rows.map((r) => r.entityType).sort();
}
