import "server-only";
import { prisma } from "@/lib/db/prisma";
import { TICKET_CATEGORIES } from "@/lib/validation/ticket";

type TicketCategory = (typeof TICKET_CATEGORIES)[number];

/**
 * Every category a customer can pick on the public "which service is this
 * about" form maps to exactly one department — this is the actual routing
 * decision, made the moment a request comes in. Billing, Maintenance, Sales
 * & Marketing and HR & Administration go to their specialist departments;
 * Technical Support goes to ICT; anything without an obvious specialist home
 * (Complaint, General Inquiry, Service Request, Account Update, Other) goes
 * to Customer Care, who triage and reassign by hand if a specific one turns
 * out to belong elsewhere. Deliberately excludes departments a customer has
 * no business selecting directly — Board, Executive, Internal Audit, SACCO
 * Credit Committee — those are internal oversight, not customer-facing
 * services.
 *
 * The "CARE" entries below are a placeholder, not a real Department.code —
 * resolveCareDepartmentCode() below picks the actual business-unit-specific
 * Customer Care team (there's one per business unit, not one shared team;
 * see the CARE -> CARE_MRE migration note in prisma/seed.ts). Every other
 * department code here must match a real Department.code from prisma/seed.ts.
 */
const CARE_PLACEHOLDER = "CARE";

const CATEGORY_DEPARTMENTS: Record<TicketCategory, { code: string; name: string }> = {
  "Billing Inquiry": { code: "FIN", name: "Finance" },
  "Maintenance Request": { code: "PROPERTY", name: "Property Management" },
  "Sales & Marketing": { code: "SALES", name: "Sales & Marketing" },
  "HR & Administration": { code: "HR", name: "HR & Administration" },
  "Technical Support": { code: "ICT", name: "ICT" },
  Complaint: { code: CARE_PLACEHOLDER, name: "Customer Care" },
  "General Inquiry": { code: CARE_PLACEHOLDER, name: "Customer Care" },
  "Service Request": { code: CARE_PLACEHOLDER, name: "Customer Care" },
  "Account Update": { code: CARE_PLACEHOLDER, name: "Customer Care" },
  Other: { code: CARE_PLACEHOLDER, name: "Customer Care" },
  "Don't Know": { code: CARE_PLACEHOLDER, name: "Customer Care" },
};

const CARE_DEPARTMENTS_BY_BUSINESS_UNIT: Record<string, { code: string; name: string }> = {
  MSL: { code: "CARE_SACCO", name: "Customer Care – SACCO" },
};

/**
 * Which Customer Care team a request lands in — MRE's is the default/
 * fallback for anything general, unclear, insurance-related, or from a
 * business unit without its own dedicated team (Housing, corporate/MGC, or
 * no business unit picked at all) — Customer Care only runs Real Estate
 * and SACCO teams, per how the company actually runs this.
 */
export function resolveCareDepartment(businessUnitCode?: string | null): { code: string; name: string } {
  if (businessUnitCode && CARE_DEPARTMENTS_BY_BUSINESS_UNIT[businessUnitCode]) {
    return CARE_DEPARTMENTS_BY_BUSINESS_UNIT[businessUnitCode];
  }
  return { code: "CARE_MRE", name: "Customer Care – Real Estate" };
}

/**
 * Every department code a ticket can legitimately land in — the same set
 * CATEGORY_DEPARTMENTS/resolveCareDepartment route into. Used to keep
 * department pickers on ticket forms (manual edit, forward-to-department)
 * from offering internal oversight departments (Board/Executive/Internal
 * Audit/SACCO Credit Committee) that have no staff able to act on a ticket
 * once it's there.
 */
export const CUSTOMER_FACING_DEPARTMENT_CODES: readonly string[] = ["FIN", "PROPERTY", "SALES", "HR", "ICT", "CARE_MRE", "CARE_SACCO"];

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
  /** The department this ticket's category deterministically belongs to — the actual routing decision. */
  department: { code: string; name: string };
  /** A different department the wording hints at, if any — review-only signal. */
  wordingHint: { code: string; name: string } | null;
}

/**
 * Category → department is a straight lookup; falls back to Customer Care
 * for anything unrecognized rather than leaving a ticket unrouted.
 * `businessUnitCode` (a BusinessUnit.code like "MSL", not an id) only
 * matters for the categories that land in Customer Care — it picks which
 * of the two CC teams; every other category's department is fixed
 * regardless of business unit.
 */
export function suggestDepartment(category: string, subject: string, description: string, businessUnitCode?: string | null): DepartmentSuggestion {
  const raw = CATEGORY_DEPARTMENTS[category as TicketCategory] ?? CATEGORY_DEPARTMENTS.Other;
  const department = raw.code === CARE_PLACEHOLDER ? resolveCareDepartment(businessUnitCode) : raw;
  const text = `${subject} ${description}`.toLowerCase();
  const hint = WORDING_HINTS.find((h) => h.departmentCode !== department.code && h.keywords.some((k) => text.includes(k)));
  return { department, wordingHint: hint ? { code: hint.departmentCode, name: hint.departmentName } : null };
}

export interface RoutingCheck {
  needsReview: boolean;
  message: string | null;
  expectedDepartment: { code: string; name: string };
}

/** Compares a ticket's current department against where its category says it belongs, plus checks the wording hint — used to render the routing warning on the ticket list/detail pages. */
export function checkRouting(
  currentDepartmentCode: string | null | undefined,
  category: string,
  subject: string,
  description: string,
  businessUnitCode?: string | null,
): RoutingCheck {
  const suggestion = suggestDepartment(category, subject, description, businessUnitCode);
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
 * department its category routes to, plus the business-unit-appropriate
 * Customer Care team always — they're the front desk and see every request
 * regardless of which department actually handles it. `businessUnitId` is a
 * BusinessUnit.id (what tickets actually store); resolved to a code here so
 * callers don't each need their own lookup.
 */
export async function getTicketWatchers(category: string, subject: string, description: string, businessUnitId?: string | null) {
  const businessUnit = businessUnitId ? await prisma.businessUnit.findUnique({ where: { id: businessUnitId }, select: { code: true } }) : null;
  const { department } = suggestDepartment(category, subject, description, businessUnit?.code);
  const careDepartment = resolveCareDepartment(businessUnit?.code);
  const departmentCodes = Array.from(new Set([department.code, careDepartment.code]));

  return prisma.user.findMany({
    where: {
      status: "ACTIVE",
      department: { code: { in: departmentCodes } },
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
