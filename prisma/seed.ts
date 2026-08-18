import { PrismaClient, type BusinessUnitCode } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { ROLES } from "../src/lib/rbac/roles";
import { PERMISSIONS, ROLE_PERMISSIONS } from "../src/lib/rbac/permissions";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../src/lib/demo-accounts";

const prisma = new PrismaClient();

const BUSINESS_UNITS: { code: BusinessUnitCode; name: string; description: string }[] = [
  { code: "MGC", name: "Masterways Group of Companies", description: "Corporate / shared services" },
  { code: "MRE", name: "Masterways Real Estate", description: "Property sales, leasing and management" },
  { code: "MSL", name: "Masterways Sacco Limited", description: "Savings and Credit Cooperative" },
  { code: "MIA", name: "Masterways Insurance Agency", description: "Insurance products and brokerage" },
  { code: "MHL", name: "Masterways Housing Limited", description: "Housing cooperative and developments" },
];

const DEPARTMENTS: { code: string; name: string; businessUnit: BusinessUnitCode }[] = [
  { code: "EXEC", name: "Executive Office", businessUnit: "MGC" },
  { code: "AUDIT", name: "Internal Audit", businessUnit: "MGC" },
  { code: "SALES", name: "Sales & Marketing", businessUnit: "MGC" },
  { code: "CARE", name: "Customer Care", businessUnit: "MGC" },
  { code: "FIN", name: "Finance", businessUnit: "MGC" },
  { code: "HR", name: "Human Resource & Administration", businessUnit: "MGC" },
  { code: "ICT", name: "ICT Department", businessUnit: "MGC" },
  { code: "PROPERTY", name: "Property Management", businessUnit: "MRE" },
  { code: "CREDIT", name: "Credit & Risk", businessUnit: "MSL" },
];

// email -> reportingTo email
const REPORTING_LINES: Record<string, string> = {
  "esther.achieng@masterways.co.ke": "daniel.kiptoo@masterways.co.ke",
  "samuel.kamau@masterways.co.ke": "daniel.kiptoo@masterways.co.ke",
  "mercy.chebet@masterways.co.ke": "daniel.kiptoo@masterways.co.ke",
  "victor.mutiso@masterways.co.ke": "daniel.kiptoo@masterways.co.ke",
  "anne.wairimu@masterways.co.ke": "diana.auma@masterways.co.ke",
  "brian.otieno@masterways.co.ke": "daniel.kiptoo@masterways.co.ke",
  "faith.njoki@masterways.co.ke": "daniel.kiptoo@masterways.co.ke",
  "kevin.omondi@masterways.co.ke": "diana.auma@masterways.co.ke",
  "diana.auma@masterways.co.ke": "daniel.kiptoo@masterways.co.ke",
  "joseph.kariuki@masterways.co.ke": "anne.wairimu@masterways.co.ke",
  "caroline.nduta@masterways.co.ke": "esther.achieng@masterways.co.ke",
  "felix.mbugua@masterways.co.ke": "daniel.kiptoo@masterways.co.ke",
  "ruth.akinyi@masterways.co.ke": "esther.achieng@masterways.co.ke",
  "lucy.wambui@masterways.co.ke": "samuel.kamau@masterways.co.ke",
  "peter.mwangi@masterways.co.ke": "grace.wanjiru@masterways.co.ke",
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

  console.log("Seeding departments...");
  const departmentByCode = new Map<string, string>();
  for (const dept of DEPARTMENTS) {
    const businessUnitId = businessUnitByCode.get(dept.businessUnit);
    const record = await prisma.department.upsert({
      where: { code: dept.code },
      update: { name: dept.name, businessUnitId },
      create: { code: dept.code, name: dept.name, businessUnitId },
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
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const userIdByEmail = new Map<string, string>();

  let sequence = 1;
  for (const account of DEMO_ACCOUNTS) {
    const roleId = roleBySlug.get(account.roleSlug);
    if (!roleId) throw new Error(`Missing role for slug ${account.roleSlug}`);

    const employeeId = `MW-${String(sequence).padStart(4, "0")}`;
    sequence += 1;

    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: {
        firstName: account.firstName,
        lastName: account.lastName,
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
  const ictAdmin = await prisma.user.findFirst({ where: { email: "victor.mutiso@masterways.co.ke" } });
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
  console.log(`Demo password for every seeded user: ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
