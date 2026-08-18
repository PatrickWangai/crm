import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { DocumentRelatedType } from "@prisma/client";
import { requireAnyPermission } from "@/lib/rbac/guard";
import { recordAudit } from "@/lib/audit/log";
import { deleteFile, saveFile } from "@/lib/storage/local";

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
]);

export type DocumentTarget =
  | { stakeholderId: string }
  | { leadId: string }
  | { ticketId: string }
  | { propertyId: string }
  | { unitId: string }
  | { leaseId: string }
  | { maintenanceRequestId: string };

interface ResolvedTarget {
  relatedType: DocumentRelatedType;
  entityType: string;
  entityId: string;
  relationField:
    | { stakeholderId: string }
    | { leadId: string }
    | { ticketId: string }
    | { propertyId: string }
    | { unitId: string }
    | { leaseId: string }
    | { maintenanceRequestId: string };
}

function resolveTarget(target: DocumentTarget): ResolvedTarget {
  if ("stakeholderId" in target) return { relatedType: "STAKEHOLDER", entityType: "Stakeholder", entityId: target.stakeholderId, relationField: target };
  if ("leadId" in target) return { relatedType: "LEAD", entityType: "Lead", entityId: target.leadId, relationField: target };
  if ("ticketId" in target) return { relatedType: "TICKET", entityType: "Ticket", entityId: target.ticketId, relationField: target };
  if ("propertyId" in target) return { relatedType: "PROPERTY", entityType: "Property", entityId: target.propertyId, relationField: target };
  if ("unitId" in target) return { relatedType: "UNIT", entityType: "Unit", entityId: target.unitId, relationField: target };
  if ("leaseId" in target) return { relatedType: "LEASE", entityType: "Lease", entityId: target.leaseId, relationField: target };
  return { relatedType: "PROPERTY", entityType: "MaintenanceRequest", entityId: target.maintenanceRequestId, relationField: target };
}

export async function uploadDocument(target: DocumentTarget, file: File) {
  const actor = await requireAnyPermission(["documents.upload"]);

  if (file.size === 0) throw new Error("The selected file is empty.");
  if (file.size > MAX_FILE_SIZE) throw new Error("File is too large. Maximum size is 15MB.");
  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    throw new Error("Unsupported file type. Allowed: PDF, Word, Excel, image, or text files.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { filePath, fileSizeBytes } = await saveFile(buffer, file.name);
  const resolved = resolveTarget(target);

  const document = await prisma.document.create({
    data: {
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      fileSizeBytes,
      filePath,
      relatedType: resolved.relatedType,
      uploadedById: actor.id,
      ...resolved.relationField,
    },
  });

  await recordAudit({
    userId: actor.id,
    action: "document.uploaded",
    entityType: resolved.entityType,
    entityId: resolved.entityId,
    newValue: { fileName: document.fileName, documentId: document.id },
  });

  return document;
}

export async function deleteDocument(documentId: string) {
  const actor = await requireAnyPermission(["documents.delete"]);
  const document = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });

  await deleteFile(document.filePath);
  await prisma.document.delete({ where: { id: documentId } });

  const entityId =
    document.stakeholderId ??
    document.leadId ??
    document.ticketId ??
    document.propertyId ??
    document.unitId ??
    document.leaseId ??
    document.maintenanceRequestId ??
    documentId;

  await recordAudit({
    userId: actor.id,
    action: "document.deleted",
    entityType: document.relatedType,
    entityId,
    previousValue: { fileName: document.fileName },
  });
}

export async function getDocumentForDownload(documentId: string) {
  await requireAnyPermission(["documents.view_all", "documents.view_own"]);
  return prisma.document.findUniqueOrThrow({ where: { id: documentId } });
}
