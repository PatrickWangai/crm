import "server-only";
import * as r2 from "./r2";
import * as local from "./local";

/**
 * Picks the document storage backend based on whether R2 credentials are
 * configured — local disk in dev (simple, no external account needed), R2
 * once R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET_NAME
 * are all set (Render's web service filesystem is ephemeral — anything
 * written to local disk in production is wiped on every redeploy).
 *
 * Warns loudly rather than silently falling back when running in
 * production without R2 configured, since that combination means uploads
 * are actively being lost on every deploy.
 */
const hasR2Config = !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME);

if (!hasR2Config && process.env.NODE_ENV === "production") {
  console.warn(
    "[storage] R2 is not configured in production — document uploads are being written to local disk, which Render wipes on every redeploy. Set R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET_NAME.",
  );
}

const backend = hasR2Config ? r2 : local;

export const saveFile = backend.saveFile;
export const readFile = backend.readFile;
export const deleteFile = backend.deleteFile;
