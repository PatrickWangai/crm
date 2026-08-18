/**
 * Seed roster: one demo user per system role, so RBAC can be exercised end to end.
 * Shared between prisma/seed.ts (creates the users) and the login screen (credential hint).
 */

export const DEMO_PASSWORD = "Masterways@2026";

export interface DemoAccount {
  firstName: string;
  lastName: string;
  email: string;
  roleSlug: string;
  departmentCode?: string;
  businessUnitCode?: "MGC" | "MRE" | "MSL" | "MIA" | "MHL";
  jobTitle: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { firstName: "Grace", lastName: "Wanjiru", email: "grace.wanjiru@masterways.co.ke", roleSlug: "board-of-directors", businessUnitCode: "MGC", jobTitle: "Board Chairperson" },
  { firstName: "Daniel", lastName: "Kiptoo", email: "daniel.kiptoo@masterways.co.ke", roleSlug: "ceo", departmentCode: "EXEC", businessUnitCode: "MGC", jobTitle: "Chief Executive Officer" },
  { firstName: "Esther", lastName: "Achieng", email: "esther.achieng@masterways.co.ke", roleSlug: "management", departmentCode: "EXEC", businessUnitCode: "MSL", jobTitle: "Management Committee Member" },
  { firstName: "Peter", lastName: "Mwangi", email: "peter.mwangi@masterways.co.ke", roleSlug: "internal-auditor", departmentCode: "AUDIT", businessUnitCode: "MGC", jobTitle: "Internal Auditor" },
  { firstName: "Faith", lastName: "Njoki", email: "faith.njoki@masterways.co.ke", roleSlug: "sales-marketing", departmentCode: "SALES", businessUnitCode: "MRE", jobTitle: "Sales & Marketing Executive" },
  { firstName: "Brian", lastName: "Otieno", email: "brian.otieno@masterways.co.ke", roleSlug: "customer-care", departmentCode: "CARE", businessUnitCode: "MGC", jobTitle: "Customer Care Agent" },
  { firstName: "Lucy", lastName: "Wambui", email: "lucy.wambui@masterways.co.ke", roleSlug: "finance", departmentCode: "FIN", businessUnitCode: "MGC", jobTitle: "Finance Officer" },
  { firstName: "Samuel", lastName: "Kamau", email: "samuel.kamau@masterways.co.ke", roleSlug: "cfo", departmentCode: "FIN", businessUnitCode: "MGC", jobTitle: "Chief Finance Officer" },
  { firstName: "Mercy", lastName: "Chebet", email: "mercy.chebet@masterways.co.ke", roleSlug: "hr-administration", departmentCode: "HR", businessUnitCode: "MGC", jobTitle: "HR & Administration Officer" },
  { firstName: "Victor", lastName: "Mutiso", email: "victor.mutiso@masterways.co.ke", roleSlug: "ict-administrator", departmentCode: "ICT", businessUnitCode: "MGC", jobTitle: "ICT Administrator" },
  { firstName: "Anne", lastName: "Wairimu", email: "anne.wairimu@masterways.co.ke", roleSlug: "property-manager", departmentCode: "PROPERTY", businessUnitCode: "MRE", jobTitle: "Senior Property Manager" },
  { firstName: "Kevin", lastName: "Omondi", email: "kevin.omondi@masterways.co.ke", roleSlug: "regional-property-coordinator", departmentCode: "PROPERTY", businessUnitCode: "MRE", jobTitle: "Regional Property Coordinator" },
  { firstName: "Diana", lastName: "Auma", email: "diana.auma@masterways.co.ke", roleSlug: "regional-manager", departmentCode: "PROPERTY", businessUnitCode: "MRE", jobTitle: "Regional Manager" },
  { firstName: "Joseph", lastName: "Kariuki", email: "joseph.kariuki@masterways.co.ke", roleSlug: "assistant-property-manager", departmentCode: "PROPERTY", businessUnitCode: "MRE", jobTitle: "Assistant Property Manager" },
  { firstName: "Caroline", lastName: "Nduta", email: "caroline.nduta@masterways.co.ke", roleSlug: "sacco-sales-marketing", departmentCode: "SALES", businessUnitCode: "MSL", jobTitle: "SACCO Sales & Marketing Officer" },
  { firstName: "Felix", lastName: "Mbugua", email: "felix.mbugua@masterways.co.ke", roleSlug: "insurance-sales-marketing", departmentCode: "SALES", businessUnitCode: "MIA", jobTitle: "Insurance Sales & Marketing Officer" },
  { firstName: "Ruth", lastName: "Akinyi", email: "ruth.akinyi@masterways.co.ke", roleSlug: "sacco-credit-committee", departmentCode: "CREDIT", businessUnitCode: "MSL", jobTitle: "Credit Committee Member" },
];
