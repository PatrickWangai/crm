export interface RoleDef {
  slug: string;
  name: string;
  description: string;
}

/**
 * System roles, per CRM Blueprint section 6.0 (User Roles) and the minimum
 * role list required for RBAC testing. Slugs are keys into ROLE_PERMISSIONS.
 */
export const ROLES: RoleDef[] = [
  { slug: "board-of-directors", name: "Board of Directors", description: "Strategic oversight, governance and high-level decision-making. Read-only access to company-wide reports." },
  { slug: "ceo", name: "Chief Executive Officer", description: "Overall operations, organizational KPIs, approvals and strategic leadership." },
  { slug: "management", name: "Management Committee", description: "Departmental / SACCO committee oversight with read-mostly access to operations and financials." },
  { slug: "internal-auditor", name: "Internal Auditor", description: "Independent assurance across all departments. Read-only access to transaction history and audit logs." },
  { slug: "sales-marketing", name: "Sales & Marketing", description: "Lead capture, sales pipeline management and marketing campaigns for MRE / MHL." },
  { slug: "customer-care", name: "Customer Care", description: "Customer inquiries, complaints and service ticket management across all business units." },
  { slug: "finance", name: "Finance", description: "Payment processing, billing, reconciliations and financial reporting." },
  { slug: "cfo", name: "Chief Finance Officer", description: "Oversight of all financial operations, approvals and financial reporting." },
  { slug: "hr-administration", name: "HR & Administration", description: "Employee lifecycle management, internal administration and organizational coordination." },
  { slug: "ict-administrator", name: "ICT Administrator", description: "Full system administration: users, roles, permissions, integrations and system settings." },
  { slug: "property-manager", name: "Senior Property Manager", description: "Property management operations, tenant management, maintenance and leasing." },
  { slug: "regional-property-coordinator", name: "Regional Property Coordinator", description: "Oversees property operations across regions / branches." },
  { slug: "regional-manager", name: "Regional Manager", description: "Oversees property operations within assigned regions and supervises field teams." },
  { slug: "assistant-property-manager", name: "Assistant Property Manager", description: "Day-to-day tenant and property management activities." },
  { slug: "sacco-sales-marketing", name: "SACCO Sales & Marketing", description: "Member acquisition, product uptake and SACCO membership campaigns." },
  { slug: "insurance-sales-marketing", name: "Insurance Sales & Marketing", description: "New policy sales, renewals and cross-selling of insurance products." },
  { slug: "sacco-credit-committee", name: "SACCO Credit Committee", description: "Credit management oversight, loan governance and lending policy compliance." },
];
