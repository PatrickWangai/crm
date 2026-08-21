import "server-only";

export const APP_URL = process.env.APP_URL || "https://masterways-crm.onrender.com";

/** Shared branded wrapper for every internal-facing notification email — ticket events, task events, and anything else that links back into the CRM. */
export function emailShell(title: string, bodyHtml: string, linkPath: string, linkLabel: string): string {
  return `
    <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 480px; margin: 0 auto;">
      <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #667085; margin: 0 0 8px;">Masterways CRM</p>
      <h2 style="font-size: 18px; margin: 0 0 12px; color: #101828;">${title}</h2>
      ${bodyHtml}
      <p style="margin-top: 20px;">
        <a href="${APP_URL}${linkPath}" style="display: inline-block; background: #1d4e89; color: #fff; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 14px;">${linkLabel}</a>
      </p>
    </div>
  `;
}

/**
 * Customer-facing wrapper — no login required to follow the link, since the
 * public pages this links to (tracker, review form) need no auth. `cta`,
 * when given, adds a single button — e.g. straight into "already looked up"
 * on the tracker (see track-request-form.tsx's auto-submit-on-load), or into
 * the review form once a request is done.
 */
export function customerEmailShell(title: string, bodyHtml: string, referenceNumber: string, cta?: { url: string; label: string }): string {
  return `
    <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 480px; margin: 0 auto;">
      <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #667085; margin: 0 0 8px;">Masterways</p>
      <h2 style="font-size: 18px; margin: 0 0 12px; color: #101828;">${title}</h2>
      ${bodyHtml}
      ${
        cta
          ? `<p style="margin-top: 20px;"><a href="${cta.url}" style="display: inline-block; background: #1d4e89; color: #fff; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 14px;">${cta.label}</a></p>`
          : ""
      }
      <p style="margin-top: 20px; font-size: 12px; color: #667085;">Reference: ${referenceNumber}</p>
    </div>
  `;
}
