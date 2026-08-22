import "server-only";
import { prisma } from "@/lib/db/prisma";

export interface RoutedDepartment {
  id: string;
  code: string;
  name: string;
}

/**
 * The one department this whole system falls back to when nothing more
 * specific is configured — the guarantee that ticket routing can never
 * come back empty, even in a misconfigured state (e.g. an admin deletes
 * every department for a category). Must always exist; prisma/seed.ts
 * guarantees it.
 */
const DEFAULT_CARE_DEPARTMENT_CODE = "CARE_MRE";

/** The corporate/shared business unit — departments owned by it (Finance, HR, ICT today) serve every business unit, not just one. */
const CORPORATE_BUSINESS_UNIT_CODE = "MGC";

/**
 * Complaint and Don't Know aren't real department specialties — both route
 * through Customer Care, same as the "Customer Care" category itself.
 */
function routingCategoryFor(category: string): string {
  if (category === "Complaint" || category === "Don't Know") return "Customer Care";
  return category;
}

/**
 * Which Customer Care team a request lands in: this business unit's own
 * team if it has one (today: Real Estate and SACCO), otherwise the
 * system-wide default — Customer Care only runs those two teams, so
 * anything general, unclear, Insurance- or Housing-related lands here.
 */
export async function resolveCareDepartment(businessUnitId?: string | null): Promise<RoutedDepartment> {
  if (businessUnitId) {
    const exact = await prisma.department.findFirst({ where: { category: "Customer Care", businessUnitId } });
    if (exact) return exact;
  }
  const fallback = await prisma.department.findUnique({ where: { code: DEFAULT_CARE_DEPARTMENT_CODE } });
  if (!fallback) {
    throw new Error(`Default Customer Care department "${DEFAULT_CARE_DEPARTMENT_CODE}" is missing — reseed the database.`);
  }
  return fallback;
}

/**
 * Which department a ticket lands in — resolved live against whatever
 * departments admins have actually configured (Department.category +
 * Department.businessUnitId), not a fixed map. Checked in order:
 *
 *   1. A department that handles this exact category AND belongs to this
 *      exact business unit (e.g. a SACCO Sales & Marketing ticket ->
 *      "Sales & Marketing – SACCO").
 *   2. A department that handles this category and is shared/corporate
 *      (owned by Masterways Group of Companies) — Finance, HR and ICT work
 *      this way today: one shared queue for every business unit.
 *   3. This business unit's own Customer Care team (resolveCareDepartment).
 *   4. The system-wide default Customer Care department — the last-resort
 *      safety net so routing never comes back empty.
 *
 * Creating a department for a given (category, business unit) pair is how
 * an admin adds a business-unit-specific team for something that's
 * currently shared — nothing here needs to change to support that.
 */
async function findRoutedDepartment(category: string, businessUnitId?: string | null): Promise<RoutedDepartment> {
  const routingCategory = routingCategoryFor(category);

  if (businessUnitId) {
    const exact = await prisma.department.findFirst({ where: { category: routingCategory, businessUnitId } });
    if (exact) return exact;
  }

  const corporate = await prisma.businessUnit.findUnique({ where: { code: CORPORATE_BUSINESS_UNIT_CODE }, select: { id: true } });
  if (corporate) {
    const shared = await prisma.department.findFirst({ where: { category: routingCategory, businessUnitId: corporate.id } });
    if (shared) return shared;
  }

  return resolveCareDepartment(businessUnitId);
}

/**
 * Purely advisory — never changes which department a ticket actually lands
 * in. Flags when the free-text wording suggests a different department than
 * the category implies (e.g. "General Inquiry" that mentions "leak"), so
 * Customer Care can catch a miscategorized request instead of it silently
 * sitting in the wrong queue.
 */
const WORDING_HINTS: { departmentCode: string; departmentName: string; keywords: string[] }[] = [
  {
    departmentCode: "FIN",
    departmentName: "Finance",
    keywords: ["invoice", "bill", "billing", "payment", "charge", "refund", "receipt", "overcharged", "rent", "arrears", "disbursement", "statement"],
  },
  {
    departmentCode: "PROPERTY",
    departmentName: "Property Management",
    keywords: ["leak", "broken", "repair", "plumbing", "electrical", "faulty", "not working", "burst", "flooding"],
  },
];

export interface DepartmentSuggestion {
  /** The department this ticket's category (and business unit) deterministically belongs to — the actual routing decision. */
  department: RoutedDepartment;
  /** A different department the wording hints at, if any — review-only signal. */
  wordingHint: { code: string; name: string } | null;
}

/**
 * Category (+ business unit) -> department, resolved live from whatever
 * departments actually exist; falls back to Customer Care for anything
 * unrecognized rather than leaving a ticket unrouted. `businessUnitId` is
 * a BusinessUnit.id — pass the ticket's own businessUnitId directly.
 */
export async function suggestDepartment(category: string, subject: string, description: string, businessUnitId?: string | null): Promise<DepartmentSuggestion> {
  const department = await findRoutedDepartment(category, businessUnitId);
  const text = `${subject} ${description}`.toLowerCase();
  const hint = WORDING_HINTS.find((h) => h.departmentCode !== department.code && h.keywords.some((k) => text.includes(k)));
  return { department, wordingHint: hint ? { code: hint.departmentCode, name: hint.departmentName } : null };
}

export interface RoutingCheck {
  needsReview: boolean;
  message: string | null;
  expectedDepartment: RoutedDepartment;
}

/** Compares a ticket's current department against where its category (+ business unit) says it belongs, plus checks the wording hint — used to render the routing warning on the ticket list/detail pages. */
export async function checkRouting(
  currentDepartmentCode: string | null | undefined,
  category: string,
  subject: string,
  description: string,
  businessUnitId?: string | null,
): Promise<RoutingCheck> {
  const suggestion = await suggestDepartment(category, subject, description, businessUnitId);
  const wrongDepartment = currentDepartmentCode !== suggestion.department.code;

  if (wrongDepartment) {
    return {
      needsReview: true,
      message: `This is a "${category}" request — it belongs with ${suggestion.department.name}. ${
        currentDepartmentCode ? "Currently routed elsewhere" : "Currently unassigned"
      }; reassign if that looks right.`,
      expectedDepartment: suggestion.department,
    };
  }

  if (suggestion.wordingHint) {
    return {
      needsReview: true,
      message: `Routed to ${suggestion.department.name} based on category, but the wording also sounds like a ${suggestion.wordingHint.name} matter — worth a second look.`,
      expectedDepartment: suggestion.department,
    };
  }

  return { needsReview: false, message: null, expectedDepartment: suggestion.department };
}

/**
 * Active staff who should be kept in the loop on a ticket: whoever's in the
 * department its category (+ business unit) routes to, plus the
 * business-unit-appropriate Customer Care team always — they're the front
 * desk and see every request regardless of which department actually
 * handles it. `businessUnitId` is a BusinessUnit.id (what tickets actually
 * store).
 */
export async function getTicketWatchers(category: string, subject: string, description: string, businessUnitId?: string | null) {
  const { department } = await suggestDepartment(category, subject, description, businessUnitId);
  const careDepartment = await resolveCareDepartment(businessUnitId);
  const departmentIds = Array.from(new Set([department.id, careDepartment.id]));

  return prisma.user.findMany({
    where: {
      status: "ACTIVE",
      departmentId: { in: departmentIds },
    },
    select: { id: true, email: true, firstName: true, lastName: true },
    distinct: ["id"],
  });
}

/** Active staff who belong to a given department (by Department.id, not code) — used to notify a whole department when a task or ticket is routed there without a specific person picked yet. */
export async function getDepartmentMembers(departmentId: string) {
  return prisma.user.findMany({
    where: { status: "ACTIVE", departmentId },
    select: { id: true, email: true, firstName: true, lastName: true },
  });
}
