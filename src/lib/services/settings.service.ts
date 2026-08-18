import "server-only";
import { prisma } from "@/lib/db/prisma";
import { requireAnyPermission } from "@/lib/rbac/guard";
import { recordAudit } from "@/lib/audit/log";
import type { SettingUpdateInput } from "@/lib/validation/settings";

export const DEFAULT_SETTINGS: { key: string; value: string; description: string }[] = [
  { key: "companyName", value: "Masterways Group of Companies", description: "Shown on receipts and other generated documents." },
  { key: "defaultCurrency", value: "KES", description: "Default currency code for amounts across the CRM." },
  { key: "supportEmail", value: "support@masterways.co.ke", description: "Contact email shown to customers." },
  { key: "timezone", value: "Africa/Nairobi", description: "Default timezone for scheduling and reporting." },
  { key: "leaseRenewalWindowDays", value: "30", description: "How many days before lease expiry the renewal reminder fires." },
];

export async function listSettings() {
  await requireAnyPermission(["settings.manage"]);
  return prisma.systemSetting.findMany({
    include: { updatedBy: { select: { firstName: true, lastName: true } } },
    orderBy: { key: "asc" },
  });
}

/** Reads a single setting's value, falling back to its documented default if never saved. Used by other services (e.g. receipts). */
export async function getSettingValue(key: string): Promise<string> {
  const setting = await prisma.systemSetting.findUnique({ where: { key } });
  if (setting) return setting.value;
  return DEFAULT_SETTINGS.find((d) => d.key === key)?.value ?? "";
}

export async function updateSetting(key: string, input: SettingUpdateInput) {
  const actor = await requireAnyPermission(["settings.manage"]);
  const description = DEFAULT_SETTINGS.find((d) => d.key === key)?.description;

  const setting = await prisma.systemSetting.upsert({
    where: { key },
    update: { value: input.value, updatedById: actor.id },
    create: { key, value: input.value, description, updatedById: actor.id },
  });

  await recordAudit({ userId: actor.id, action: "setting.updated", entityType: "SystemSetting", entityId: setting.id, newValue: { key, value: input.value } });

  return setting;
}
