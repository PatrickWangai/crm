import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { BusinessUnitCode } from "@prisma/client";
import { requireAnyPermission } from "@/lib/rbac/guard";
import { recordAudit } from "@/lib/audit/log";
import { parseCsv } from "@/lib/csv";
import { STAKEHOLDER_TYPES } from "@/lib/validation/stakeholder";
import { UNIT_STATUSES } from "@/lib/validation/unit";
import { LEAD_SOURCES } from "@/lib/validation/lead";
import { createStakeholder } from "@/lib/services/stakeholder.service";
import { createProperty } from "@/lib/services/property.service";
import { createUnit } from "@/lib/services/unit.service";
import { createLead } from "@/lib/services/lead.service";
import { createLease } from "@/lib/services/lease.service";

export interface ImportResult {
  successCount: number;
  errors: { row: number; message: string }[];
}

function cell(row: Record<string, string>, key: string): string {
  return row[key]?.trim() ?? "";
}

function requireCell(row: Record<string, string>, key: string): string {
  const value = cell(row, key);
  if (!value) throw new Error(`"${key}" is required`);
  return value;
}

async function resolveBusinessUnitId(code: string): Promise<string> {
  if (!code) return "";
  const bu = await prisma.businessUnit.findUnique({ where: { code: code.toUpperCase() as BusinessUnitCode } });
  if (!bu) throw new Error(`No business unit with code "${code}"`);
  return bu.id;
}

async function resolveUserIdByEmail(email: string): Promise<string> {
  if (!email) return "";
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`No user found with email "${email}"`);
  return user.id;
}

async function resolveStakeholderIdByCode(code: string): Promise<string> {
  if (!code) return "";
  const stakeholder = await prisma.stakeholder.findUnique({ where: { code } });
  if (!stakeholder) throw new Error(`No stakeholder with code "${code}"`);
  return stakeholder.id;
}

async function resolvePropertyIdByCode(code: string): Promise<string> {
  const property = await prisma.property.findUnique({ where: { code } });
  if (!property) throw new Error(`No property with code "${code}"`);
  return property.id;
}

async function resolveUnitIdByCode(code: string): Promise<string> {
  const unit = await prisma.unit.findUnique({ where: { code } });
  if (!unit) throw new Error(`No unit with code "${code}"`);
  return unit.id;
}

async function runImport(rows: Record<string, string>[], importRow: (row: Record<string, string>) => Promise<void>): Promise<ImportResult> {
  const errors: ImportResult["errors"] = [];
  let successCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // header is row 1
    try {
      await importRow(rows[i]);
      successCount++;
    } catch (err) {
      errors.push({ row: rowNum, message: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return { successCount, errors };
}

export async function importStakeholdersCsv(csvText: string): Promise<ImportResult> {
  const actor = await requireAnyPermission(["stakeholders.create"]);
  const rows = parseCsv(csvText);

  const result = await runImport(rows, async (row) => {
    const type = requireCell(row, "type").toUpperCase();
    if (!(STAKEHOLDER_TYPES as readonly string[]).includes(type)) {
      throw new Error(`Invalid type "${type}" — must be one of ${STAKEHOLDER_TYPES.join(", ")}`);
    }
    const businessUnitId = await resolveBusinessUnitId(cell(row, "businessUnitCode"));
    const assignedStaffId = await resolveUserIdByEmail(cell(row, "assignedStaffEmail"));

    await createStakeholder({
      type: type as (typeof STAKEHOLDER_TYPES)[number],
      firstName: requireCell(row, "firstName"),
      lastName: requireCell(row, "lastName"),
      organization: cell(row, "organization"),
      email: cell(row, "email"),
      phone: cell(row, "phone"),
      alternatePhone: cell(row, "alternatePhone"),
      address: cell(row, "address"),
      city: cell(row, "city"),
      idNumber: cell(row, "idNumber"),
      kraPin: cell(row, "kraPin"),
      businessUnitId,
      assignedStaffId,
    });
  });

  await recordAudit({ userId: actor.id, action: "stakeholder.bulk_imported", entityType: "Stakeholder", newValue: result });
  return result;
}

export async function importPropertiesCsv(csvText: string): Promise<ImportResult> {
  const actor = await requireAnyPermission(["properties.manage"]);
  const rows = parseCsv(csvText);

  const result = await runImport(rows, async (row) => {
    const businessUnitId = await resolveBusinessUnitId(cell(row, "businessUnitCode"));
    const landlordId = await resolveStakeholderIdByCode(cell(row, "landlordCode"));

    await createProperty({
      name: requireCell(row, "name"),
      propertyType: requireCell(row, "propertyType"),
      address: cell(row, "address"),
      city: cell(row, "city"),
      region: cell(row, "region"),
      businessUnitId,
      landlordId,
      ezenPropertyRef: cell(row, "ezenPropertyRef"),
    });
  });

  await recordAudit({ userId: actor.id, action: "property.bulk_imported", entityType: "Property", newValue: result });
  return result;
}

export async function importUnitsCsv(csvText: string): Promise<ImportResult> {
  const actor = await requireAnyPermission(["units.manage"]);
  const rows = parseCsv(csvText);

  const result = await runImport(rows, async (row) => {
    const propertyId = await resolvePropertyIdByCode(requireCell(row, "propertyCode"));
    const status = cell(row, "status").toUpperCase() || "VACANT";
    if (!(UNIT_STATUSES as readonly string[]).includes(status)) {
      throw new Error(`Invalid status "${status}" — must be one of ${UNIT_STATUSES.join(", ")}`);
    }
    const bedroomsRaw = cell(row, "bedrooms");
    const bathroomsRaw = cell(row, "bathrooms");
    const sizeSqmRaw = cell(row, "sizeSqm");

    await createUnit(propertyId, {
      unitNumber: requireCell(row, "unitNumber"),
      unitType: requireCell(row, "unitType"),
      floor: cell(row, "floor"),
      bedrooms: bedroomsRaw ? Number(bedroomsRaw) : "",
      bathrooms: bathroomsRaw ? Number(bathroomsRaw) : "",
      sizeSqm: sizeSqmRaw ? Number(sizeSqmRaw) : "",
      rentAmount: Number(requireCell(row, "rentAmount")),
      status: status as (typeof UNIT_STATUSES)[number],
    });
  });

  await recordAudit({ userId: actor.id, action: "unit.bulk_imported", entityType: "Unit", newValue: result });
  return result;
}

export async function importLeadsCsv(csvText: string): Promise<ImportResult> {
  const actor = await requireAnyPermission(["leads.create"]);
  const rows = parseCsv(csvText);

  const result = await runImport(rows, async (row) => {
    const source = requireCell(row, "source").toUpperCase();
    if (!(LEAD_SOURCES as readonly string[]).includes(source)) {
      throw new Error(`Invalid source "${source}" — must be one of ${LEAD_SOURCES.join(", ")}`);
    }
    const businessUnitId = await resolveBusinessUnitId(cell(row, "businessUnitCode"));
    const assignedToId = await resolveUserIdByEmail(cell(row, "assignedToEmail"));

    const interestedPropertyCode = cell(row, "interestedPropertyCode");
    const interestedPropertyId = interestedPropertyCode ? await resolvePropertyIdByCode(interestedPropertyCode) : "";
    const interestedUnitCode = cell(row, "interestedUnitCode");
    const interestedUnitId = interestedUnitCode ? await resolveUnitIdByCode(interestedUnitCode) : "";

    await createLead({
      firstName: requireCell(row, "firstName"),
      lastName: requireCell(row, "lastName"),
      email: cell(row, "email"),
      phone: cell(row, "phone"),
      source: source as (typeof LEAD_SOURCES)[number],
      sourceDetail: cell(row, "sourceDetail"),
      requirements: cell(row, "requirements"),
      businessUnitId,
      assignedToId,
      nextFollowUpAt: "",
      interestedPropertyId,
      interestedUnitId,
    });
  });

  await recordAudit({ userId: actor.id, action: "lead.bulk_imported", entityType: "Lead", newValue: result });
  return result;
}

export async function importLeasesCsv(csvText: string): Promise<ImportResult> {
  const actor = await requireAnyPermission(["leases.manage"]);
  const rows = parseCsv(csvText);

  const result = await runImport(rows, async (row) => {
    const unitId = await resolveUnitIdByCode(requireCell(row, "unitCode"));
    const tenantId = await resolveStakeholderIdByCode(requireCell(row, "tenantCode"));
    const landlordId = await resolveStakeholderIdByCode(cell(row, "landlordCode"));
    const depositRaw = cell(row, "depositAmount");

    await createLease({
      unitId,
      tenantId,
      landlordId,
      startDate: requireCell(row, "startDate"),
      endDate: requireCell(row, "endDate"),
      rentAmount: Number(requireCell(row, "rentAmount")),
      depositAmount: depositRaw ? Number(depositRaw) : "",
    });
  });

  await recordAudit({ userId: actor.id, action: "lease.bulk_imported", entityType: "Lease", newValue: result });
  return result;
}
