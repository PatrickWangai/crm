import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Local-disk document storage. Swap this module for an S3/GCS-backed
 * implementation later — callers only depend on save/read/remove, not on
 * where bytes physically live.
 */
const STORAGE_ROOT = path.join(process.cwd(), "storage", "documents");

async function ensureRoot() {
  await fs.mkdir(STORAGE_ROOT, { recursive: true });
}

export async function saveFile(buffer: Buffer, originalName: string): Promise<{ filePath: string; fileSizeBytes: number }> {
  await ensureRoot();
  const ext = path.extname(originalName).slice(0, 10);
  const key = `${randomUUID()}${ext}`;
  await fs.writeFile(path.join(STORAGE_ROOT, key), buffer);
  return { filePath: key, fileSizeBytes: buffer.byteLength };
}

export async function readFile(filePath: string): Promise<Buffer> {
  return fs.readFile(path.join(STORAGE_ROOT, path.basename(filePath)));
}

export async function deleteFile(filePath: string): Promise<void> {
  await fs.rm(path.join(STORAGE_ROOT, path.basename(filePath)), { force: true });
}
