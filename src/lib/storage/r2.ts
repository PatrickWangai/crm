import "server-only";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import path from "node:path";

/**
 * Cloudflare R2 (S3-compatible) document storage — same shape as
 * ./local.ts so callers never know which one is actually in use. See
 * ./index.ts for which one gets picked.
 */
const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;

export async function saveFile(buffer: Buffer, originalName: string): Promise<{ filePath: string; fileSizeBytes: number }> {
  const ext = path.extname(originalName).slice(0, 10);
  const key = `${randomUUID()}${ext}`;
  await client.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer }));
  return { filePath: key, fileSizeBytes: buffer.byteLength };
}

export async function readFile(filePath: string): Promise<Buffer> {
  const key = path.basename(filePath);
  const result = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const body = result.Body;
  if (!body) throw new Error(`R2 object has no body: ${key}`);
  const chunks: Uint8Array[] = [];
  // @ts-expect-error - Body is a Node Readable stream at runtime in this SDK's Node build
  for await (const chunk of body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export async function deleteFile(filePath: string): Promise<void> {
  const key = path.basename(filePath);
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
