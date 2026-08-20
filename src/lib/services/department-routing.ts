import "server-only";
import { prisma } from "@/lib/db/prisma";

/**
 * Which department(s) beyond the default tickets.assign holders (CEO,
 * Customer Care) should be notified about a ticket — matched by exact
 * category OR by wording, since a customer might tag something
 * "Complaint"/"General Inquiry" that's actually about money or a leaking
 * pipe rather than picking the "obvious" category. Add a row here to route
 * a new department; each permissionCode should be one that department
 * actually holds (checked against ROLE_PERMISSIONS), and departmentCode
 * should match a real Department.code from prisma/seed.ts. Shared between
 * the public portal (new request, department assignment) and the internal
 * ticket lifecycle (accepted, completed, routing-check display) so the same
 * matching logic drives all of it.
 */
const DEPARTMENT_ROUTES: { permissionCode: string; departmentCode: string; departmentName: string; categories: string[]; keywords: string[] }[] = [
  {
    permissionCode: "finance.view",
    departmentCode: "FIN",
    departmentName: "Finance",
    categories: ["Billing Inquiry"],
    keywords: ["invoice", "bill", "billing", "payment", "charge", "refund", "receipt", "overcharged", "rent", "arrears", "disbursement", "statement"],
  },
  {
    permissionCode: "maintenance.manage",
    departmentCode: "PROPERTY",
    departmentName: "Property Management",
    categories: ["Maintenance Request"],
    keywords: ["leak", "broken", "repair", "plumbing", "electrical", "faulty", "not working", "burst", "flooding"],
  },
];

function matchedRoutes(category: string, subject: string, description: string) {
  const text = `${subject} ${description}`.toLowerCase();
  return DEPARTMENT_ROUTES.filter((route) => route.categories.includes(category) || route.keywords.some((k) => text.includes(k)));
}

export function matchedDepartmentPermissions(category: string, subject: string, description: string): string[] {
  return matchedRoutes(category, subject, description).map((route) => route.permissionCode);
}

export interface DepartmentSuggestion {
  /** "matched" = exactly one department's wording/category matched, safe to auto-assign. "ambiguous" = more than one matched, needs a human call. "none" = nothing specific matched (a general inquiry, stays in the general Customer Care queue). */
  status: "matched" | "ambiguous" | "none";
  departments: { code: string; name: string }[];
}

/** Pure, synchronous — same matching used for notification routing, reframed as a department recommendation for a specific ticket's content. */
export function suggestDepartment(category: string, subject: string, description: string): DepartmentSuggestion {
  const matches = matchedRoutes(category, subject, description);
  if (matches.length === 0) return { status: "none", departments: [] };
  const departments = matches.map((m) => ({ code: m.departmentCode, name: m.departmentName }));
  return { status: matches.length === 1 ? "matched" : "ambiguous", departments };
}

export interface RoutingCheck {
  suggestion: DepartmentSuggestion;
  /** false only when the suggestion engine has an opinion (matched or ambiguous) that disagrees with — or wasn't applied to — the ticket's current department. */
  needsReview: boolean;
}

/** Compares a ticket's current department against what the routing engine would suggest from its content right now — flags drift from manual reassignment, edited wording, or an ambiguous/no-match case that was never resolved. */
export function checkRouting(currentDepartmentCode: string | null | undefined, category: string, subject: string, description: string): RoutingCheck {
  const suggestion = suggestDepartment(category, subject, description);
  if (suggestion.status === "none") return { suggestion, needsReview: false };
  if (suggestion.status === "ambiguous") return { suggestion, needsReview: true };
  return { suggestion, needsReview: currentDepartmentCode !== suggestion.departments[0].code };
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
