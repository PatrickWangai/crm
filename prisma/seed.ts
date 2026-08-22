import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { ROLES } from "../src/lib/rbac/roles";
import { PERMISSIONS, ROLE_PERMISSIONS } from "../src/lib/rbac/permissions";
import { DEMO_ACCOUNTS } from "../src/lib/demo-accounts";

const prisma = new PrismaClient();

const BUSINESS_UNITS: { code: string; name: string; description: string }[] = [
  { code: "MGC", name: "Masterways Group of Companies", description: "Corporate / shared services" },
  { code: "MRE", name: "Masterways Real Estate", description: "Property sales, leasing and management" },
  { code: "MSL", name: "Masterways Sacco Limited", description: "Savings and Credit Cooperative" },
  { code: "MIA", name: "Masterways Insurance Agency", description: "Insurance products and brokerage" },
  { code: "MHL", name: "Masterways Housing Limited", description: "Housing cooperative and developments" },
];

// The company runs a separate Customer Care team per business unit it
// actually staffs one for — just Real Estate and SACCO, not one shared
// team. CARE_MRE is the default/fallback for general, unclear, or
// insurance-related requests (there's no dedicated Insurance CC team). The
// old single "CARE" department is renamed in place to CARE_MRE (see the
// migration step in main() below) so existing users/tickets keep their
// department, rather than being recreated under a new id. Same story for
// Sales & Marketing: SALES (one shared queue) is renamed in place to
// SALES_MRE, and SALES_SACCO/SALES_MIA are new departments matching the
// business-unit-specific sales staff that already exist.
//
// `category` is what department-routing.ts actually keys off of to route
// an incoming ticket — it's the routable category this department
// handles, scoped to `businessUnit`. Oversight departments (Executive,
// Internal Audit, Credit & Risk) take no tickets, so their category is
// null and department-routing.ts's lookups never resolve to them.
//
// SALES_MHL/PROPERTY_SACCO/PROPERTY_MIA/PROPERTY_MHL/CARE_MIA/CARE_MHL
// (below the MSL/PROPERTY line) are demo-only placeholders filling in the
// remaining category x business-unit gaps — added for full demo coverage
// until the real company roster replaces the seeded accounts entirely, at
// which point these should be reviewed rather than assumed permanent.
const DEPARTMENTS: { code: string; name: string; businessUnit: string; category: string | null }[] = [
  { code: "EXEC", name: "Executive Office", businessUnit: "MGC", category: null },
  { code: "AUDIT", name: "Internal Audit", businessUnit: "MGC", category: null },
  { code: "SALES_MRE", name: "Sales & Marketing – Real Estate", businessUnit: "MRE", category: "Sales & Marketing" },
  { code: "SALES_SACCO", name: "Sales & Marketing – SACCO", businessUnit: "MSL", category: "Sales & Marketing" },
  { code: "SALES_MIA", name: "Sales & Marketing – Insurance", businessUnit: "MIA", category: "Sales & Marketing" },
  { code: "CARE_MRE", name: "Customer Care – Real Estate", businessUnit: "MRE", category: "Customer Care" },
  { code: "CARE_SACCO", name: "Customer Care – SACCO", businessUnit: "MSL", category: "Customer Care" },
  { code: "FIN", name: "Finance", businessUnit: "MGC", category: "Finance" },
  { code: "HR", name: "Human Resource & Administration", businessUnit: "MGC", category: "HR & Administration" },
  { code: "ICT", name: "ICT Department", businessUnit: "MGC", category: "Technical Support" },
  { code: "PROPERTY", name: "Property Management", businessUnit: "MRE", category: "Property Management" },
  { code: "CREDIT", name: "Credit & Risk", businessUnit: "MSL", category: null },
  { code: "SALES_MHL", name: "Sales & Marketing – Housing", businessUnit: "MHL", category: "Sales & Marketing" },
  { code: "PROPERTY_SACCO", name: "Property Management – SACCO", businessUnit: "MSL", category: "Property Management" },
  { code: "PROPERTY_MIA", name: "Property Management – Insurance", businessUnit: "MIA", category: "Property Management" },
  { code: "PROPERTY_MHL", name: "Property Management – Housing", businessUnit: "MHL", category: "Property Management" },
  { code: "CARE_MIA", name: "Customer Care – Insurance", businessUnit: "MIA", category: "Customer Care" },
  { code: "CARE_MHL", name: "Customer Care – Housing", businessUnit: "MHL", category: "Customer Care" },
];

// email -> reportingTo email
const REPORTING_LINES: Record<string, string> = {
  "management@masterways.co.ke": "ceo@masterways.co.ke",
  "cfo@masterways.co.ke": "ceo@masterways.co.ke",
  "hr-administration@masterways.co.ke": "ceo@masterways.co.ke",
  "ict-administrator@masterways.co.ke": "ceo@masterways.co.ke",
  "property-manager@masterways.co.ke": "regional-manager@masterways.co.ke",
  "customer-care@masterways.co.ke": "ceo@masterways.co.ke",
  "customer-care-sacco@masterways.co.ke": "management@masterways.co.ke",
  "sales-marketing@masterways.co.ke": "ceo@masterways.co.ke",
  "regional-property-coordinator@masterways.co.ke": "regional-manager@masterways.co.ke",
  "regional-manager@masterways.co.ke": "ceo@masterways.co.ke",
  "assistant-property-manager@masterways.co.ke": "property-manager@masterways.co.ke",
  "sacco-sales-marketing@masterways.co.ke": "management@masterways.co.ke",
  "insurance-sales-marketing@masterways.co.ke": "ceo@masterways.co.ke",
  "sacco-credit-committee@masterways.co.ke": "management@masterways.co.ke",
  "finance@masterways.co.ke": "cfo@masterways.co.ke",
  "internal-auditor@masterways.co.ke": "board-of-directors@masterways.co.ke",
  "housing-sales-marketing@masterways.co.ke": "ceo@masterways.co.ke",
  "sacco-property-manager@masterways.co.ke": "management@masterways.co.ke",
  "insurance-property-manager@masterways.co.ke": "ceo@masterways.co.ke",
  "housing-property-manager@masterways.co.ke": "ceo@masterways.co.ke",
  "customer-care-insurance@masterways.co.ke": "ceo@masterways.co.ke",
  "customer-care-housing@masterways.co.ke": "ceo@masterways.co.ke",
};

const SLA_POLICIES: {
  name: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
}[] = [
  { name: "Standard – Low Priority", priority: "LOW", responseTimeMinutes: 480, resolutionTimeMinutes: 4320 },
  { name: "Standard – Medium Priority", priority: "MEDIUM", responseTimeMinutes: 240, resolutionTimeMinutes: 1440 },
  { name: "Standard – High Priority", priority: "HIGH", responseTimeMinutes: 60, resolutionTimeMinutes: 480 },
  { name: "Standard – Urgent Priority", priority: "URGENT", responseTimeMinutes: 15, resolutionTimeMinutes: 120 },
];

const WORKFLOWS: { name: string; description: string; triggerType: string }[] = [
  { name: "Task overdue reminder", description: "Flags PENDING/IN_PROGRESS tasks past their due date and notifies the assignee.", triggerType: "task.overdue_check" },
  { name: "Ticket SLA risk alert", description: "Notifies the assignee when an open ticket is past 75% of its SLA window or breached.", triggerType: "ticket.sla_risk_check" },
  { name: "Lead follow-up reminder", description: "Notifies the assigned agent when a lead's next follow-up date is due or overdue.", triggerType: "lead.follow_up_check" },
  { name: "Lease renewal reminder", description: "Flags active leases expiring within 30 days as Pending Renewal and notifies property managers.", triggerType: "lease.renewal_check" },
];

const COMMUNICATION_TEMPLATES: { name: string; channel: "EMAIL" | "SMS" | "WHATSAPP"; subject?: string; body: string }[] = [
  {
    name: "Lead welcome email",
    channel: "EMAIL",
    subject: "Welcome to Masterways",
    body: "Hi {{firstName}},\n\nThank you for your interest in Masterways. One of our agents will be in touch shortly to discuss your requirements.\n\nRegards,\nMasterways Team",
  },
  {
    name: "Lease renewal reminder",
    channel: "SMS",
    body: "Hi {{firstName}}, your lease for {{unitNumber}} is expiring soon. Please contact your property manager to discuss renewal.",
  },
  {
    name: "Payment received confirmation",
    channel: "WHATSAPP",
    body: "Hi {{firstName}}, we've received your payment of {{amount}} against invoice {{invoiceNumber}}. Thank you!",
  },
];

const INTEGRATIONS: { provider: "EZEN" | "SACCO_CBS" | "SMS_GATEWAY" | "EMAIL_GATEWAY" | "WHATSAPP_GATEWAY" | "AI_ASSISTANT"; displayName: string }[] = [
  { provider: "EZEN", displayName: "Ezen Property Management System" },
  { provider: "SACCO_CBS", displayName: "SACCO Core Banking System" },
  { provider: "SMS_GATEWAY", displayName: "SMS Gateway" },
  { provider: "EMAIL_GATEWAY", displayName: "Email Gateway" },
  { provider: "WHATSAPP_GATEWAY", displayName: "WhatsApp Business API" },
  { provider: "AI_ASSISTANT", displayName: "AI Assistant / Automation" },
];

async function main() {
  console.log("Seeding business units...");
  const businessUnitByCode = new Map<string, string>();
  for (const bu of BUSINESS_UNITS) {
    const record = await prisma.businessUnit.upsert({
      where: { code: bu.code },
      update: { name: bu.name, description: bu.description },
      create: bu,
    });
    businessUnitByCode.set(bu.code, record.id);
  }

  // One-time migration: the old single "CARE" department is renamed in
  // place to CARE_MRE (same row/id, so every existing user/ticket/task/
  // review already pointing at it keeps working) instead of being
  // recreated — a plain upsert-by-code below would otherwise leave the old
  // CARE row orphaned and create a brand new, empty CARE_MRE row. Guarded
  // so it only fires once: the second time this runs, code "CARE" no
  // longer exists and this is a no-op forever after.
  const oldCareDept = await prisma.department.findUnique({ where: { code: "CARE" } });
  if (oldCareDept) {
    const mreBusinessUnitId = businessUnitByCode.get("MRE");
    await prisma.department.update({
      where: { id: oldCareDept.id },
      data: { code: "CARE_MRE", name: "Customer Care – Real Estate", businessUnitId: mreBusinessUnitId },
    });
    console.log("Migrated existing Customer Care department (CARE) -> CARE_MRE");
  }

  // One-time cleanup: CARE_INSURANCE was created by an earlier version of
  // this seed and is being removed — Customer Care only runs Real Estate
  // and SACCO teams. Reassigns anything that landed there (tickets, leads,
  // tasks, reviews) to CARE_MRE before deleting the department, and
  // removes the demo account that was in it (deleting, not reassigning —
  // it shouldn't exist at all now, unlike the CARE rename above which kept
  // its user). Guarded the same way: a no-op once CARE_INSURANCE is gone.
  const insuranceCareDept = await prisma.department.findUnique({ where: { code: "CARE_INSURANCE" } });
  if (insuranceCareDept) {
    const mreDept = await prisma.department.findUniqueOrThrow({ where: { code: "CARE_MRE" } });
    await prisma.ticket.updateMany({ where: { departmentId: insuranceCareDept.id }, data: { departmentId: mreDept.id } });
    await prisma.lead.updateMany({ where: { departmentId: insuranceCareDept.id }, data: { departmentId: mreDept.id } });
    await prisma.task.updateMany({ where: { departmentId: insuranceCareDept.id }, data: { departmentId: mreDept.id } });
    await prisma.review.updateMany({ where: { departmentId: insuranceCareDept.id }, data: { departmentId: mreDept.id } });

    const insuranceCareUsers = await prisma.user.findMany({ where: { departmentId: insuranceCareDept.id }, select: { id: true } });
    const insuranceCareUserIds = insuranceCareUsers.map((u) => u.id);
    if (insuranceCareUserIds.length > 0) {
      // AuditLog.userId doesn't cascade (audit history is normally kept even
      // if the actor is later removed) — safe to clear here since this
      // account never should have existed, not real history being erased.
      await prisma.auditLog.deleteMany({ where: { userId: { in: insuranceCareUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: insuranceCareUserIds } } });
    }

    await prisma.department.delete({ where: { id: insuranceCareDept.id } });
    console.log("Removed Customer Care – Insurance (CARE_INSURANCE) — Customer Care only runs Real Estate and SACCO teams");
  }

  // One-time migration: the old shared "SALES" department (one queue that
  // every business unit's Sales & Marketing tickets landed in, even though
  // dedicated Real Estate/SACCO/Insurance sales staff already exist) is
  // renamed in place to SALES_MRE — same reasoning as the CARE -> CARE_MRE
  // rename above: existing users/tickets/leads pointing at it keep
  // working, rather than being orphaned under a recreated row.
  // SALES_SACCO/SALES_MIA are created fresh by the normal upsert loop
  // below, and the two demo accounts that used to share the old SALES
  // queue are repointed at their own department via demo-accounts.ts's
  // departmentCode. No-op once "SALES" no longer exists.
  const oldSalesDept = await prisma.department.findUnique({ where: { code: "SALES" } });
  if (oldSalesDept) {
    await prisma.department.update({
      where: { id: oldSalesDept.id },
      data: { code: "SALES_MRE", name: "Sales & Marketing – Real Estate", businessUnitId: businessUnitByCode.get("MRE") },
    });
    console.log("Migrated existing Sales & Marketing department (SALES) -> SALES_MRE");
  }

  console.log("Seeding departments...");
  const departmentByCode = new Map<string, string>();
  for (const dept of DEPARTMENTS) {
    const businessUnitId = businessUnitByCode.get(dept.businessUnit);
    const record = await prisma.department.upsert({
      where: { code: dept.code },
      update: { name: dept.name, businessUnitId, category: dept.category },
      create: { code: dept.code, name: dept.name, businessUnitId, category: dept.category },
    });
    departmentByCode.set(dept.code, record.id);
  }

  console.log("Seeding roles...");
  const roleBySlug = new Map<string, string>();
  for (const role of ROLES) {
    const record = await prisma.role.upsert({
      where: { slug: role.slug },
      update: { name: role.name, description: role.description },
      create: { slug: role.slug, name: role.name, description: role.description },
    });
    roleBySlug.set(role.slug, record.id);
  }

  console.log("Seeding permissions...");
  const permissionByCode = new Map<string, string>();
  for (const perm of PERMISSIONS) {
    const record = await prisma.permission.upsert({
      where: { code: perm.code },
      update: { module: perm.module, action: perm.action, description: perm.description },
      create: perm,
    });
    permissionByCode.set(perm.code, record.id);
  }

  console.log("Wiring role -> permission grants...");
  for (const [roleSlug, codes] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleBySlug.get(roleSlug);
    if (!roleId) {
      console.warn(`  ! No role found for slug "${roleSlug}", skipping.`);
      continue;
    }
    for (const code of codes) {
      const permissionId = permissionByCode.get(code);
      if (!permissionId) {
        console.warn(`  ! No permission found for code "${code}", skipping.`);
        continue;
      }
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      });
    }
  }

  console.log("Seeding demo users...");
  const userIdByEmail = new Map<string, string>();

  let sequence = 1;
  for (const account of DEMO_ACCOUNTS) {
    const roleId = roleBySlug.get(account.roleSlug);
    if (!roleId) throw new Error(`Missing role for slug ${account.roleSlug}`);

    const employeeId = `MW-${String(sequence).padStart(4, "0")}`;
    const passwordHash = await hashPassword(account.password);
    sequence += 1;

    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: {
        firstName: account.firstName,
        lastName: account.lastName,
        passwordHash,
        roleId,
        departmentId: account.departmentCode ? departmentByCode.get(account.departmentCode) : undefined,
        businessUnitId: account.businessUnitCode ? businessUnitByCode.get(account.businessUnitCode) : undefined,
        jobTitle: account.jobTitle,
      },
      create: {
        employeeId,
        firstName: account.firstName,
        lastName: account.lastName,
        email: account.email,
        passwordHash,
        phone: `+2547${String(10000000 + sequence).slice(0, 8)}`,
        roleId,
        departmentId: account.departmentCode ? departmentByCode.get(account.departmentCode) : undefined,
        businessUnitId: account.businessUnitCode ? businessUnitByCode.get(account.businessUnitCode) : undefined,
        jobTitle: account.jobTitle,
        hireDate: new Date(2023, sequence % 12, (sequence % 27) + 1),
        employmentStatus: "ACTIVE",
        status: "ACTIVE",
      },
    });
    userIdByEmail.set(account.email, user.id);
  }

  console.log("Wiring reporting lines...");
  for (const [email, managerEmail] of Object.entries(REPORTING_LINES)) {
    const userId = userIdByEmail.get(email);
    const managerId = userIdByEmail.get(managerEmail);
    if (userId && managerId) {
      await prisma.user.update({ where: { id: userId }, data: { reportingToId: managerId } });
    }
  }

  console.log("Seeding welcome notifications...");
  for (const [email, userId] of userIdByEmail.entries()) {
    const existing = await prisma.notification.findFirst({
      where: { userId, type: "SYSTEM", title: "Welcome to Masterways CRM" },
    });
    if (!existing) {
      await prisma.notification.create({
        data: {
          userId,
          type: "SYSTEM",
          title: "Welcome to Masterways CRM",
          message: `Your workspace is ready. Sign in with ${email} to get started.`,
        },
      });
    }
  }

  console.log("Seeding default SLA policies...");
  for (const policy of SLA_POLICIES) {
    const existing = await prisma.sLA.findFirst({ where: { name: policy.name } });
    if (!existing) {
      await prisma.sLA.create({
        data: {
          name: policy.name,
          priority: policy.priority,
          responseTimeMinutes: policy.responseTimeMinutes,
          resolutionTimeMinutes: policy.resolutionTimeMinutes,
          isActive: true,
        },
      });
    }
  }

  console.log("Seeding integration placeholders (mock, ready to wire to real APIs)...");
  for (const integration of INTEGRATIONS) {
    await prisma.integrationConfig.upsert({
      where: { provider: integration.provider },
      update: { displayName: integration.displayName },
      create: { provider: integration.provider, displayName: integration.displayName, status: "MOCK" },
    });
  }

  console.log("Seeding default workflow automations...");
  const ictAdmin = await prisma.user.findFirst({ where: { email: "ict-administrator@masterways.co.ke" } });
  for (const wf of WORKFLOWS) {
    const existing = await prisma.workflow.findFirst({ where: { triggerType: wf.triggerType } });
    if (!existing) {
      await prisma.workflow.create({
        data: { name: wf.name, description: wf.description, triggerType: wf.triggerType, isActive: true, createdById: ictAdmin?.id },
      });
    }
  }

  console.log("Seeding default communication templates...");
  for (const tpl of COMMUNICATION_TEMPLATES) {
    const existing = await prisma.communicationTemplate.findFirst({ where: { name: tpl.name } });
    if (!existing) {
      await prisma.communicationTemplate.create({
        data: { name: tpl.name, channel: tpl.channel, subject: tpl.subject, body: tpl.body, isActive: true, createdById: ictAdmin?.id },
      });
    }
  }

  console.log(
    `\nSeed complete: ${BUSINESS_UNITS.length} business units, ${DEPARTMENTS.length} departments, ${ROLES.length} roles, ${PERMISSIONS.length} permissions, ${DEMO_ACCOUNTS.length} users, ${SLA_POLICIES.length} SLA policies, ${WORKFLOWS.length} workflow automations, ${COMMUNICATION_TEMPLATES.length} communication templates.`,
  );
  console.log("Each demo account has its own distinct password — see src/lib/demo-accounts.ts or the login page.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
