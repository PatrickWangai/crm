/**
 * Seed roster: one demo user per system role, so RBAC can be exercised end to end.
 * Shared between prisma/seed.ts (creates the users) and the login screen (credential hint).
 *
 * Emails are role-based (not name-based) and each account has its own distinct
 * password, rather than one password shared across every account.
 *
 * Names are functional placeholders ("Head of Finance"), not fictional
 * people — swap in real staff names once Masterways provides their roster.
 */

export interface DemoAccount {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roleSlug: string;
  departmentCode?: string;
  businessUnitCode?: "MGC" | "MRE" | "MSL" | "MIA" | "MHL";
  jobTitle: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { firstName: "Head of", lastName: "the Board", email: "board-of-directors@masterways.co.ke", password: "NRaemp57q#8", roleSlug: "board-of-directors", businessUnitCode: "MGC", jobTitle: "Board Chairperson" },
  { firstName: "Head of", lastName: "the Company", email: "ceo@masterways.co.ke", password: "rGyWbd2f3$4", roleSlug: "ceo", departmentCode: "EXEC", businessUnitCode: "MGC", jobTitle: "Chief Executive Officer" },
  { firstName: "Head of", lastName: "Management", email: "management@masterways.co.ke", password: "3MgW6gtxa3@", roleSlug: "management", departmentCode: "EXEC", businessUnitCode: "MSL", jobTitle: "Management Committee Member" },
  { firstName: "Head of", lastName: "Internal Audit", email: "internal-auditor@masterways.co.ke", password: "VY3ygs!pf94", roleSlug: "internal-auditor", departmentCode: "AUDIT", businessUnitCode: "MGC", jobTitle: "Internal Auditor" },
  { firstName: "Head of", lastName: "Real Estate Sales", email: "sales-marketing@masterways.co.ke", password: "4CTznrut53%", roleSlug: "sales-marketing", departmentCode: "SALES_MRE", businessUnitCode: "MRE", jobTitle: "Sales & Marketing Executive" },
  { firstName: "Head of", lastName: "Customer Care (Real Estate)", email: "customer-care@masterways.co.ke", password: "TnmZ9wv$36w", roleSlug: "customer-care", departmentCode: "CARE_MRE", businessUnitCode: "MRE", jobTitle: "Customer Care Agent – Real Estate" },
  { firstName: "Head of", lastName: "Finance", email: "finance@masterways.co.ke", password: "B78Mkkua6p#", roleSlug: "finance", departmentCode: "FIN", businessUnitCode: "MGC", jobTitle: "Finance Officer" },
  { firstName: "Head of", lastName: "Finance (CFO)", email: "cfo@masterways.co.ke", password: "KCbwxdj258$", roleSlug: "cfo", departmentCode: "FIN", businessUnitCode: "MGC", jobTitle: "Chief Finance Officer" },
  { firstName: "Head of", lastName: "HR & Administration", email: "hr-administration@masterways.co.ke", password: "KU3anbn9j!2", roleSlug: "hr-administration", departmentCode: "HR", businessUnitCode: "MGC", jobTitle: "HR & Administration Officer" },
  { firstName: "Head of", lastName: "ICT", email: "ict-administrator@masterways.co.ke", password: "NSnzjjf9!97", roleSlug: "ict-administrator", departmentCode: "ICT", businessUnitCode: "MGC", jobTitle: "ICT Administrator" },
  { firstName: "Head of", lastName: "Property Management", email: "property-manager@masterways.co.ke", password: "bXd52pUpd6$", roleSlug: "property-manager", departmentCode: "PROPERTY", businessUnitCode: "MRE", jobTitle: "Senior Property Manager" },
  { firstName: "Head of", lastName: "Regional Property Coordination", email: "regional-property-coordinator@masterways.co.ke", password: "Pr%V7yw6ra2", roleSlug: "regional-property-coordinator", departmentCode: "PROPERTY", businessUnitCode: "MRE", jobTitle: "Regional Property Coordinator" },
  { firstName: "Head of", lastName: "Regional Operations", email: "regional-manager@masterways.co.ke", password: "E4wt#Brc3h9", roleSlug: "regional-manager", departmentCode: "PROPERTY", businessUnitCode: "MRE", jobTitle: "Regional Manager" },
  { firstName: "Head of", lastName: "Property Management (Assistant)", email: "assistant-property-manager@masterways.co.ke", password: "Tcpuh!Xx275", roleSlug: "assistant-property-manager", departmentCode: "PROPERTY", businessUnitCode: "MRE", jobTitle: "Assistant Property Manager" },
  { firstName: "Head of", lastName: "SACCO Sales", email: "sacco-sales-marketing@masterways.co.ke", password: "7RYyz$3en3p", roleSlug: "sacco-sales-marketing", departmentCode: "SALES_SACCO", businessUnitCode: "MSL", jobTitle: "SACCO Sales & Marketing Officer" },
  { firstName: "Head of", lastName: "Insurance Sales", email: "insurance-sales-marketing@masterways.co.ke", password: "m32V8Wu$rnu", roleSlug: "insurance-sales-marketing", departmentCode: "SALES_MIA", businessUnitCode: "MIA", jobTitle: "Insurance Sales & Marketing Officer" },
  { firstName: "Head of", lastName: "the Credit Committee", email: "sacco-credit-committee@masterways.co.ke", password: "MFh3wfq%25e", roleSlug: "sacco-credit-committee", departmentCode: "CREDIT", businessUnitCode: "MSL", jobTitle: "Credit Committee Member" },
  // Appended, not inserted earlier in the list — seed.ts assigns each
  // account's employeeId from its position in this array (only on first
  // creation; existing users keep theirs), so adding new accounts anywhere
  // but the end reshuffles every account after them and collides with
  // already-assigned employeeIds.
  { firstName: "Head of", lastName: "Customer Care (SACCO)", email: "customer-care-sacco@masterways.co.ke", password: "Qf82!wznTr5", roleSlug: "customer-care", departmentCode: "CARE_SACCO", businessUnitCode: "MSL", jobTitle: "Customer Care Agent – SACCO" },
  // Demo-only placeholders filling in the remaining category x business-unit
  // gaps (see prisma/seed.ts's DEPARTMENTS comment) — for full demo coverage
  // until the real company roster replaces this file entirely. Reuse the
  // existing role slugs (sales-marketing, property-manager, customer-care)
  // rather than minting new ones: they're already business-unit-agnostic —
  // sales-marketing's own description already covers "MRE / MHL", and
  // customer-care's covers "across all business units" — so department
  // membership (departmentCode below), not the role slug, is what actually
  // ties each account to its business unit.
  { firstName: "Head of", lastName: "Housing Sales", email: "housing-sales-marketing@masterways.co.ke", password: "7tgL26TDJ%J", roleSlug: "sales-marketing", departmentCode: "SALES_MHL", businessUnitCode: "MHL", jobTitle: "Housing Sales & Marketing Officer" },
  { firstName: "Head of", lastName: "Property Management (SACCO)", email: "sacco-property-manager@masterways.co.ke", password: "4k#aU4bf5Hn", roleSlug: "property-manager", departmentCode: "PROPERTY_SACCO", businessUnitCode: "MSL", jobTitle: "Property Manager – SACCO" },
  { firstName: "Head of", lastName: "Property Management (Insurance)", email: "insurance-property-manager@masterways.co.ke", password: "U4#r43ujeFe", roleSlug: "property-manager", departmentCode: "PROPERTY_MIA", businessUnitCode: "MIA", jobTitle: "Property Manager – Insurance" },
  { firstName: "Head of", lastName: "Property Management (Housing)", email: "housing-property-manager@masterways.co.ke", password: "TkRnE%236p9", roleSlug: "property-manager", departmentCode: "PROPERTY_MHL", businessUnitCode: "MHL", jobTitle: "Property Manager – Housing" },
  { firstName: "Head of", lastName: "Customer Care (Insurance)", email: "customer-care-insurance@masterways.co.ke", password: "!XZ5gug9365", roleSlug: "customer-care", departmentCode: "CARE_MIA", businessUnitCode: "MIA", jobTitle: "Customer Care Agent – Insurance" },
  { firstName: "Head of", lastName: "Customer Care (Housing)", email: "customer-care-housing@masterways.co.ke", password: "if3$5jDhA77", roleSlug: "customer-care", departmentCode: "CARE_MHL", businessUnitCode: "MHL", jobTitle: "Customer Care Agent – Housing" },
];
