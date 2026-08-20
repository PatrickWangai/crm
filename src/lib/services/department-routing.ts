import "server-only";
import { prisma } from "@/lib/db/prisma";

/**
 * Which department(s) beyond the default tickets.assign holders (CEO,
 * Customer Care) should be notified about a ticket — matched by exact
 * category OR by wording, since a customer might tag something
 * "Complaint"/"General Inquiry" that's actually about money or a leaking
 * pipe rather than picking the "obvious" category. Add a row here to route
 * a new department; each permissionCode should be one that department
 * actually holds (checked against ROLE_PERMISSIONS). Shared between the
 * public portal (new request) and the internal ticket lifecycle (accepted,
 * completed) so the same audience is kept in the loop throughout.
 */
const DEPARTMENT_ROUTES: { permissionCode: string; categories: string[]; keywords: string[] }[] = [
  {
    permissionCode: "finance.view",
    categories: ["Billing Inquiry"],
    keywords: ["invoice", "bill", "billing", "payment", "charge", "refund", "receipt", "overcharged", "rent", "arrears", "disbursement", "statement"],
  },
  {
    permissionCode: "maintenance.manage",
    categories: ["Maintenance Request"],
    keywords: ["leak", "broken", "repair", "plumbing", "electrical", "faulty", "not working", "burst", "flooding"],
  },
];

export function matchedDepartmentPermissions(category: string, subject: string, description: string): string[] {
  const text = `${subject} ${description}`.toLowerCase();
  return DEPARTMENT_ROUTES.filter((route) => route.categories.includes(category) || route.keywords.some((k) => text.includes(k))).map(
    (route) => route.permissionCode,
  );
}

/**
 * Active users who should be kept in the loop on a ticket: general triage
 * (tickets.assign — CEO, Customer Care, anyone with broad ticket authority)
 * plus whichever specific department(s) the wording/category routes to.
 */
export async function getTicketWatchers(category: string, subject: string, description: string) {
  const permissionCodes = ["tickets.assign", ...matchedDepartmentPermissions(category, subject, description)];
  return prisma.user.findMany({
    where: {
      status: "ACTIVE",
      role: { rolePermissions: { some: { permission: { code: { in: permissionCodes } } } } },
    },
    select: { id: true, email: true, firstName: true, lastName: true },
    distinct: ["id"],
  });
}
