import "server-only";
import { prisma } from "@/lib/db/prisma";
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

export type DocumentTarget = { stakeholderId: string } | { leadId: string } | { ticketId: string };

function relatedTypeFor(target: DocumentTarget) {
  if ("stakeholderId" in target) return "STAKEHOLDER" as const;
  if ("leadId" in target) return "LEAD" as const;
  return "TICKET" as const;
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

  const document = await prisma.document.create({
    data: {
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      fileSizeBytes,
      filePath,
      relatedType: relatedTypeFor(target),
      stakeholderId: "stakeholderId" in target ? target.stakeholderId : undefined,
      leadId: "leadId" in target ? target.leadId : undefined,
      ticketId: "ticketId" in target ? target.ticketId : undefined,
      uploadedById: actor.id,
    },
  });

  const entityType = "stakeholderId" in target ? "Stakeholder" : "leadId" in target ? "Lead" : "Ticket";
  const entityId = "stakeholderId" in target ? target.stakeholderId : "leadId" in target ? target.leadId : target.ticketId;

  await recordAudit({
    userId: actor.id,
    action: "document.uploaded",
    entityType,
    entityId,
    newValue: { fileName: document.fileName, documentId: document.id },
  });

  return document;
}

export async function deleteDocument(documentId: string) {
  const actor = await requireAnyPermission(["documents.delete"]);
  const document = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });

  await deleteFile(document.filePath);
  await prisma.document.delete({ where: { id: documentId } });

  await recordAudit({
    userId: actor.id,
    action: "document.deleted",
    entityType: document.relatedType,
    entityId: document.stakeholderId ?? document.leadId ?? document.ticketId ?? documentId,
    previousValue: { fileName: document.fileName },
  });
}

export async function getDocumentForDownload(documentId: string) {
  await requireAnyPermission(["documents.view_all", "documents.view_own"]);
  return prisma.document.findUniqueOrThrow({ where: { id: documentId } });
}
