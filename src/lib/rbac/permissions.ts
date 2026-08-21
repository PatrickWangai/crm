/**
 * Central permission catalog for the Masterways CRM.
 * Permission codes follow the pattern `${module}.${action}`.
 * This is the single source of truth consumed by:
 *  - the Prisma seed script (creates Permission + RolePermission rows)
 *  - server-side authorization checks (lib/rbac/guard.ts)
 *  - the Administration > Roles & Permissions screen
 */

export const MODULES = [
  "dashboard",
  "stakeholders",
  "leads",
  "opportunities",
  "tickets",
  "properties",
  "units",
  "leases",
  "maintenance",
  "tasks",
  "communications",
  "documents",
  "notifications",
  "reports",
  "campaigns",
  "finance",
  "employees",
  "users",
  "roles",
  "departments",
  "audit_logs",
  "settings",
  "integrations",
  "reviews",
  "live_activity",
] as const;

export type Module = (typeof MODULES)[number];

export interface PermissionDef {
  code: string;
  module: Module;
  action: string;
  description: string;
}

function p(module: Module, action: string, description: string): PermissionDef {
  return { code: `${module}.${action}`, module, action, description };
}

export const PERMISSIONS: PermissionDef[] = [
  p("dashboard", "view", "View role-aware dashboard"),

  p("stakeholders", "view_all", "View all stakeholder profiles (customers, tenants, landlords, members, clients)"),
  p("stakeholders", "view_own", "View stakeholders assigned to self"),
  p("stakeholders", "create", "Create stakeholder profiles"),
  p("stakeholders", "update", "Update stakeholder profiles"),
  p("stakeholders", "delete", "Delete stakeholder profiles"),
  p("stakeholders", "export", "Export stakeholder data"),

  p("leads", "view_all", "View all leads across the organization"),
  p("leads", "view_own", "View leads assigned to self"),
  p("leads", "create", "Capture new leads"),
  p("leads", "update", "Update lead details / pipeline stage"),
  p("leads", "delete", "Delete leads"),
  p("leads", "assign", "Assign / reassign leads to agents"),
  p("leads", "export", "Export lead data"),

  p("opportunities", "view_all", "View all sales opportunities"),
  p("opportunities", "view_own", "View own opportunities"),
  p("opportunities", "manage", "Create / update opportunities"),

  p("tickets", "view_all", "View all customer service tickets"),
  p("tickets", "view_own", "View tickets assigned to self"),
  p("tickets", "create", "Log new tickets"),
  p("tickets", "update", "Update ticket status / details"),
  p("tickets", "delete", "Delete tickets"),
  p("tickets", "assign", "Assign / escalate tickets"),
  p("tickets", "close", "Close / resolve tickets"),

  p("properties", "view_all", "View all properties"),
  p("properties", "manage", "Create / update properties"),

  p("units", "view_all", "View all units"),
  p("units", "manage", "Create / update units"),

  p("leases", "view_all", "View all leases"),
  p("leases", "manage", "Create / update leases"),

  p("maintenance", "view_all", "View all maintenance requests / job cards"),
  p("maintenance", "manage", "Create / update / assign job cards"),

  p("tasks", "view_all", "View all tasks across departments"),
  p("tasks", "view_own", "View tasks assigned to self"),
  p("tasks", "create", "Create tasks"),
  p("tasks", "update", "Update / complete tasks"),
  p("tasks", "delete", "Delete tasks"),
  p("tasks", "assign", "Assign tasks to staff"),

  p("communications", "view_all", "View all communication history"),
  p("communications", "view_own", "View own communication history"),
  p("communications", "create", "Log communications"),

  p("documents", "view_all", "View all documents"),
  p("documents", "view_own", "View own related documents"),
  p("documents", "upload", "Upload documents"),
  p("documents", "delete", "Delete documents"),

  p("notifications", "view_own", "View own notifications"),

  p("reports", "view", "View reports & analytics"),

  p("campaigns", "view_all", "View marketing campaigns"),
  p("campaigns", "manage", "Create / update campaigns"),

  p("finance", "view", "View finance records (invoices, payments)"),
  p("finance", "manage", "Create / update invoices & payments"),
  p("finance", "approve", "Approve financial disbursements"),

  p("employees", "view_all", "View employee records"),
  p("employees", "manage", "Create / update employee records"),

  p("users", "manage", "Manage user accounts"),
  p("users", "manage_department", "Add team members within your own department"),
  p("roles", "manage", "Manage roles & permissions"),
  p("departments", "manage", "Manage departments & business units"),
  p("audit_logs", "view", "View system audit logs"),
  p("settings", "manage", "Manage system settings"),
  p("integrations", "manage", "Manage external integrations"),
  p("reviews", "view_all", "View customer reviews across all departments"),
  p("live_activity", "view", "See live visitor activity on the public help/support pages"),
];

export const PERMISSION_CODES = PERMISSIONS.map((perm) => perm.code);

/** All permission codes — used for roles that get full/superadmin access. */
const ALL: string[] = PERMISSION_CODES;

const BASE_SALES: string[] = [
  "dashboard.view",
  "leads.view_own",
  "leads.create",
  "leads.update",
  "leads.assign",
  "leads.export",
  "opportunities.view_own",
  "opportunities.manage",
  "stakeholders.view_own",
  "stakeholders.create",
  "stakeholders.update",
  "properties.view_all",
  "units.view_all",
  "communications.view_own",
  "communications.create",
  "campaigns.view_all",
  "campaigns.manage",
  "documents.upload",
  "documents.view_own",
  "tasks.view_own",
  "tasks.create",
  "tasks.update",
  "reports.view",
  "notifications.view_own",
  // "Sales & Marketing" tickets (public support requests routed to this
  // department — see department-routing.ts) need to actually be visible and
  // actionable, not just notified about.
  "tickets.view_own",
  "tickets.assign",
  "tickets.update",
  // Each sales team can grow itself without going through ICT — see
  // department-team-roles.ts for exactly which roles this lets them add.
  "users.manage_department",
];

/**
 * Role slug -> granted permission codes.
 * Seeded verbatim into RolePermission on `prisma db seed`.
 * Editable afterwards via Administration > Roles & Permissions.
 */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  "board-of-directors": [
    "dashboard.view",
    "reports.view",
    "stakeholders.view_all",
    "leads.view_all",
    "tickets.view_all",
    "properties.view_all",
    "finance.view",
    "campaigns.view_all",
    "employees.view_all",
    "audit_logs.view",
    "notifications.view_own",
    // Customer reviews are a board-level oversight signal on service
    // quality — same tier as audit_logs.view here, not a working-ticket
    // permission.
    "reviews.view_all",
  ],
  ceo: [
    "dashboard.view",
    "reports.view",
    "stakeholders.view_all",
    "leads.view_all",
    "tickets.view_all",
    "tickets.assign",
    "properties.view_all",
    "leases.view_all",
    "maintenance.view_all",
    "finance.view",
    "finance.approve",
    "campaigns.view_all",
    "employees.view_all",
    "tasks.view_all",
    "tasks.assign",
    "audit_logs.view",
    "notifications.view_own",
    "reviews.view_all",
  ],
  management: [
    "dashboard.view",
    "reports.view",
    "stakeholders.view_all",
    "leads.view_all",
    "tickets.view_all",
    "finance.view",
    "campaigns.view_all",
    "employees.view_all",
    "notifications.view_own",
  ],
  "internal-auditor": [
    "dashboard.view",
    "reports.view",
    "audit_logs.view",
    "stakeholders.view_all",
    "leads.view_all",
    "tickets.view_all",
    "properties.view_all",
    "units.view_all",
    "leases.view_all",
    "maintenance.view_all",
    "finance.view",
    "documents.view_all",
    "communications.view_all",
    "employees.view_all",
    "campaigns.view_all",
    "notifications.view_own",
  ],
  "sales-marketing": BASE_SALES,
  "customer-care": [
    "dashboard.view",
    "tickets.view_all",
    "tickets.create",
    "tickets.update",
    "tickets.assign",
    "tickets.close",
    "stakeholders.view_all",
    "stakeholders.update",
    "stakeholders.create",
    "communications.view_all",
    "communications.create",
    "documents.upload",
    "documents.view_all",
    "tasks.view_own",
    "tasks.create",
    "tasks.update",
    "reports.view",
    "notifications.view_own",
    "users.manage_department",
    // Live help-page visitor activity is Customer Care's own working view —
    // not a general reporting permission, so it's granted here specifically
    // rather than added to reports.view (which several other departments
    // also hold).
    "live_activity.view",
  ],
  finance: [
    "dashboard.view",
    "finance.view",
    "finance.manage",
    "leases.view_all",
    "stakeholders.view_all",
    "reports.view",
    "documents.upload",
    "documents.view_all",
    "tasks.view_own",
    "tasks.create",
    // Had create but not update — could open a task and never mark it
    // complete or comment on it. Every other department role with
    // tasks.create also has tasks.update.
    "tasks.update",
    "notifications.view_own",
    "tickets.view_own",
    "tickets.assign",
    "tickets.update",
    // Every operational role in an active department can add teammates now,
    // not just the head — DEPARTMENT_HEAD_ROLE in department-team-roles.ts
    // still stops Finance Officer from minting a new CFO specifically.
    "users.manage_department",
  ],
  cfo: [
    "dashboard.view",
    "finance.view",
    "finance.manage",
    "finance.approve",
    "reports.view",
    "stakeholders.view_all",
    "leases.view_all",
    "employees.view_all",
    "tickets.view_own",
    "tickets.assign",
    "tickets.update",
    "audit_logs.view",
    "notifications.view_own",
    // CFO, not Finance Officer, is Finance's head — mirrors who else holds
    // this across departments (customer-care, property-manager, etc.).
    "users.manage_department",
  ],
  "hr-administration": [
    "dashboard.view",
    "employees.view_all",
    "employees.manage",
    "documents.upload",
    "documents.view_all",
    "tasks.view_own",
    "tasks.create",
    "tasks.update",
    "communications.view_own",
    "communications.create",
    "reports.view",
    "notifications.view_own",
    // "HR & Administration" tickets (public support requests routed to this
    // department — see department-routing.ts) need to actually be visible
    // and actionable, not just notified about.
    "tickets.view_own",
    "tickets.assign",
    "tickets.update",
    "users.manage_department",
  ],
  "ict-administrator": ALL,
  "property-manager": [
    "dashboard.view",
    "properties.view_all",
    "properties.manage",
    "units.view_all",
    "units.manage",
    "leases.view_all",
    "leases.manage",
    "maintenance.view_all",
    "maintenance.manage",
    "stakeholders.view_all",
    "stakeholders.update",
    "stakeholders.create",
    "tickets.view_all",
    // The property department's actual head — like customer-care/finance/hr,
    // needs assign alongside update to receive, hand off, and reassign the
    // Maintenance Request tickets routed here (see department-routing.ts).
    "tickets.assign",
    "tickets.update",
    "communications.view_own",
    "communications.create",
    "documents.upload",
    "documents.view_all",
    "tasks.view_own",
    "tasks.create",
    "tasks.update",
    "tasks.assign",
    "reports.view",
    "notifications.view_own",
    // Every operational Property role can add teammates now, not just the
    // head — DEPARTMENT_HEAD_ROLE in department-team-roles.ts still stops
    // the other three from minting a new Senior Property Manager.
    "users.manage_department",
  ],
  "regional-property-coordinator": [
    "dashboard.view",
    "properties.view_all",
    "units.view_all",
    "leases.view_all",
    "maintenance.view_all",
    "maintenance.manage",
    "stakeholders.view_all",
    "tickets.view_all",
    "tasks.view_own",
    "tasks.create",
    "tasks.update",
    "reports.view",
    "notifications.view_own",
    "communications.view_own",
    "communications.create",
    "users.manage_department",
  ],
  "regional-manager": [
    "dashboard.view",
    "properties.view_all",
    "units.view_all",
    "leases.view_all",
    "maintenance.view_all",
    "stakeholders.view_all",
    "tickets.view_all",
    "leads.view_all",
    "tasks.view_all",
    "reports.view",
    "notifications.view_own",
    "communications.view_own",
    "users.manage_department",
  ],
  "assistant-property-manager": [
    "dashboard.view",
    "properties.view_all",
    "units.view_all",
    "units.manage",
    "leases.view_all",
    "maintenance.view_all",
    "maintenance.manage",
    "leads.view_own",
    "leads.create",
    "stakeholders.view_own",
    "stakeholders.update",
    "stakeholders.create",
    "tasks.view_own",
    "tasks.create",
    "tasks.update",
    "communications.view_own",
    "communications.create",
    "documents.upload",
    "notifications.view_own",
    "tickets.view_own",
    "tickets.assign",
    "tickets.update",
    "users.manage_department",
  ],
  "sacco-sales-marketing": BASE_SALES,
  "insurance-sales-marketing": BASE_SALES,
  "sacco-credit-committee": [
    "dashboard.view",
    "stakeholders.view_all",
    "reports.view",
    "finance.view",
    "tasks.view_own",
    "notifications.view_own",
  ],
};
