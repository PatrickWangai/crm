import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { DocumentRelatedType } from "@prisma/client";
import { requireAnyPermission, hasPermission, ForbiddenError } from "@/lib/rbac/guard";
import type { CurrentUser } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit/log";
import { deleteFile, saveFile } from "@/lib/storage";

export const DOCUMENT_ACCESS_LEVELS = ["internal", "restricted", "public"] as const;
export type DocumentAccessLevel = (typeof DOCUMENT_ACCESS_LEVELS)[number];

/**
 * "restricted" documents are only visible to whoever uploaded them and to
 * documents.view_all holders (the broad/admin tier) — everyone else who can
 * otherwise see the parent record (e.g. a view_own-scoped agent) is denied,
 * both in listings (filterVisibleDocuments) and on the actual download route
 * (getDocumentForDownload), which is the enforcement point that actually
 * matters. "internal" (default) and "public" are visible to anyone who can
 * already view the parent record — unchanged from prior behavior.
 */
export function canViewDocument(user: CurrentUser, document: { accessLevel: string; uploadedById: string | null }): boolean {
  if (document.accessLevel !== "restricted") return true;
  if (!user) return false;
  if (document.uploadedById === user.id) return true;
  return hasPermission(user, "documents.view_all");
}

export function filterVisibleDocuments<T extends { accessLevel: string; uploadedById: string | null }>(user: CurrentUser, documents: T[]): T[] {
  return documents.filter((doc) => canViewDocument(user, doc));
}

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

export async function uploadDocument(target: DocumentTarget, file: File, accessLevel: DocumentAccessLevel = "internal") {
  const actor = await requireAnyPermission(["documents.upload"]);

  if (file.size === 0) throw new Error("The selected file is empty.");
  if (file.size > MAX_FILE_SIZE) throw new Error("File is too large. Maximum size is 15MB.");
  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    throw new Error("Unsupported file type. Allowed: PDF, Word, Excel, image, or text files.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { filePath, fileSizeBytes } = await saveFile(buffer, file.name);
  const resolved = resolveTarget(target);

  // Re-uploading a file with the same name against the same record supersedes
  // it as a new version, rather than two unrelated rows both claiming v1.
  const previousVersion = await prisma.document.findFirst({
    where: { fileName: file.name, relatedType: resolved.relatedType, ...resolved.relationField },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  const document = await prisma.document.create({
    data: {
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      fileSizeBytes,
      filePath,
      relatedType: resolved.relatedType,
      uploadedById: actor.id,
      version: (previousVersion?.version ?? 0) + 1,
      accessLevel,
      ...resolved.relationField,
    },
  });

  await recordAudit({
    userId: actor.id,
    action: "document.uploaded",
    entityType: resolved.entityType,
    entityId: resolved.entityId,
    newValue: { fileName: document.fileName, documentId: document.id, version: document.version },
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
  const actor = await requireAnyPermission(["documents.view_all", "documents.view_own"]);
  const document = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });
  if (!canViewDocument(actor, document)) {
    throw new ForbiddenError("This document is restricted to its uploader and users with full document access.");
  }
  return document;
}
