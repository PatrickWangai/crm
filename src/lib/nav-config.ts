import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Users, Building2, ShieldCheck, Landmark, ClipboardList, Contact } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Permission code(s) required to see/use this item. Array = any-of. */
  permission: string | string[];
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

/**
 * Sidebar navigation. Grouped by section; only items whose page exists are
 * listed here (no dead links). Later phases append new sections/items —
 * the sidebar itself does not need to change shape.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard.view" }],
  },
  {
    label: "CRM",
    items: [
      {
        label: "Stakeholders",
        href: "/stakeholders",
        icon: Contact,
        permission: ["stakeholders.view_all", "stakeholders.view_own"],
      },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Users", href: "/admin/users", icon: Users, permission: "users.manage" },
      { label: "Roles & Permissions", href: "/admin/roles", icon: ShieldCheck, permission: "roles.manage" },
      { label: "Departments", href: "/admin/departments", icon: Building2, permission: "departments.manage" },
      { label: "Business Units", href: "/admin/business-units", icon: Landmark, permission: "departments.manage" },
      { label: "Audit Log", href: "/admin/audit-log", icon: ClipboardList, permission: "audit_logs.view" },
    ],
  },
];
