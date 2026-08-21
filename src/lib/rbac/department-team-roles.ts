/**
 * Which roles a department can self-add through "My Team" (see
 * team.service.ts), keyed by Department.code. Deliberately narrower than
 * the full 17-role catalog in permissions.ts — a department head should be
 * able to grow their own team, not mint an account for a role that belongs
 * to a different department entirely.
 *
 * Only the six active, staffed departments are listed — Executive Office,
 * Internal Audit and Credit & Risk are governance bodies without a
 * self-service "add a teammate" workflow, same boundary already drawn for
 * ticket routing (see department-routing.ts's CUSTOMER_FACING_DEPARTMENT_CODES).
 */
export const DEPARTMENT_TEAM_ROLES: Record<string, string[]> = {
  // Customer Care runs a Real Estate team and a SACCO team, not one shared
  // team — see the CARE -> CARE_MRE migration note in prisma/seed.ts.
  CARE_MRE: ["customer-care"],
  CARE_SACCO: ["customer-care"],
  FIN: ["finance", "cfo"],
  HR: ["hr-administration"],
  ICT: ["ict-administrator"],
  PROPERTY: ["property-manager", "regional-property-coordinator", "regional-manager", "assistant-property-manager"],
  SALES: ["sales-marketing", "sacco-sales-marketing", "insurance-sales-marketing"],
};

/**
 * The one role per department (if any) that only an existing holder of that
 * same role can grant to a new teammate — stops a subordinate from minting
 * a new head-level account (e.g. a Finance Officer creating another CFO).
 * Every other role listed in DEPARTMENT_TEAM_ROLES is assignable by anyone
 * with users.manage_department in that department, head or not.
 *
 * This same map also drives head succession ("Leave & appoint a successor"
 * on My Team — see user.service.ts's succeedDepartmentHead). Only
 * departments with a genuinely distinct head role above the rest of the
 * team appear here — Finance (Officer -> CFO) and Property (the other three
 * roles -> Senior Property Manager). The two Customer Care teams, HR,
 * ICT and Sales each have either just one shared role (no promotion to
 * model) or several equally-ranked variants with no defined head, so
 * succession isn't offered there.
 */
export const DEPARTMENT_HEAD_ROLE: Record<string, string | undefined> = {
  FIN: "cfo",
  PROPERTY: "property-manager",
};
