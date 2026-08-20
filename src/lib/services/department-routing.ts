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
 * Department codes must match a real Department.code from prisma/seed.ts.
 */
const CATEGORY_DEPARTMENTS: Record<TicketCategory, { code: string; name: string }> = {
  "Billing Inquiry": { code: "FIN", name: "Finance" },
  "Maintenance Request": { code: "PROPERTY", name: "Property Management" },
  "Sales & Marketing": { code: "SALES", name: "Sales & Marketing" },
  "HR & Administration": { code: "HR", name: "HR & Administration" },
  "Technical Support": { code: "ICT", name: "ICT" },
  Complaint: { code: "CARE", name: "Customer Care" },
  "General Inquiry": { code: "CARE", name: "Customer Care" },
  "Service Request": { code: "CARE", name: "Customer Care" },
  "Account Update": { code: "CARE", name: "Customer Care" },
  Other: { code: "CARE", name: "Customer Care" },
};

const CARE_DEPARTMENT_CODE = "CARE";

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

/** Category → department is a straight lookup; falls back to Customer Care for anything unrecognized rather than leaving a ticket unrouted. */
export function suggestDepartment(category: string, subject: string, description: string): DepartmentSuggestion {
  const department = CATEGORY_DEPARTMENTS[category as TicketCategory] ?? CATEGORY_DEPARTMENTS.Other;
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
export function checkRouting(currentDepartmentCode: string | null | undefined, category: string, subject: string, description: string): RoutingCheck {
  const suggestion = suggestDepartment(category, subject, description);
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
 * department its category routes to, plus Customer Care always — they're
 * the front desk and see every request regardless of which department
 * actually handles it.
 */
export async function getTicketWatchers(category: string, subject: string, description: string) {
  const { department } = suggestDepartment(category, subject, description);
  const departmentCodes = Array.from(new Set([department.code, CARE_DEPARTMENT_CODE]));

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
