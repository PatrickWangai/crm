import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Building2,
  ShieldCheck,
  Landmark,
  ClipboardList,
  Contact,
  Users2,
  Ticket,
  Timer,
  Home,
  FileSignature,
  Wrench,
  Receipt,
  CheckSquare,
  Bell,
  MessageSquare,
  BarChart3,
  Plug,
  Workflow as WorkflowIcon,
  Settings,
  MessagesSquare,
  HeartPulse,
  Star,
} from "lucide-react";

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
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
      { label: "Reports & Analytics", href: "/reports", icon: BarChart3, permission: "reports.view" },
      { label: "Customer Reviews", href: "/reviews", icon: Star, permission: "reviews.view_all" },
      { label: "Notifications", href: "/notifications", icon: Bell, permission: "notifications.view_own" },
      { label: "Tasks", href: "/tasks", icon: CheckSquare, permission: ["tasks.view_all", "tasks.view_own"] },
    ],
  },
  {
    label: "CRM",
    items: [
      {
        label: "Leads",
        href: "/leads",
        icon: Users2,
        permission: ["leads.view_all", "leads.view_own"],
      },
      {
        label: "Stakeholders",
        href: "/stakeholders",
        icon: Contact,
        permission: ["stakeholders.view_all", "stakeholders.view_own"],
      },
      {
        label: "Communications",
        href: "/communications",
        icon: MessageSquare,
        permission: ["communications.view_all", "communications.view_own"],
      },
    ],
  },
  {
    label: "Customer Care",
    items: [
      {
        label: "Tickets",
        href: "/tickets",
        icon: Ticket,
        permission: ["tickets.view_all", "tickets.view_own"],
      },
    ],
  },
  {
    label: "Property Management",
    items: [
      { label: "Properties", href: "/properties", icon: Home, permission: "properties.view_all" },
      { label: "Leases", href: "/leases", icon: FileSignature, permission: "leases.view_all" },
      { label: "Maintenance", href: "/maintenance", icon: Wrench, permission: "maintenance.view_all" },
    ],
  },
  {
    label: "Finance",
    items: [{ label: "Invoices & Payments", href: "/finance", icon: Receipt, permission: "finance.view" }],
  },
  {
    label: "Administration",
    items: [
      { label: "Users", href: "/admin/users", icon: Users, permission: "users.manage" },
      { label: "Roles & Permissions", href: "/admin/roles", icon: ShieldCheck, permission: "roles.manage" },
      { label: "Departments", href: "/admin/departments", icon: Building2, permission: "departments.manage" },
      { label: "Business Units", href: "/admin/business-units", icon: Landmark, permission: "departments.manage" },
      { label: "SLA Policies", href: "/admin/sla", icon: Timer, permission: "settings.manage" },
      { label: "Workflow Automations", href: "/admin/workflows", icon: WorkflowIcon, permission: "settings.manage" },
      { label: "System Settings", href: "/admin/settings", icon: Settings, permission: "settings.manage" },
      { label: "Communication Templates", href: "/admin/communication-templates", icon: MessagesSquare, permission: "settings.manage" },
      { label: "System Health", href: "/admin/system-health", icon: HeartPulse, permission: "settings.manage" },
      { label: "Integrations", href: "/admin/integrations", icon: Plug, permission: "integrations.manage" },
      { label: "Audit Log", href: "/admin/audit-log", icon: ClipboardList, permission: "audit_logs.view" },
    ],
  },
];
