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
 * public tracker (/help?tab=track) needs no auth. `trackingUrl`, when given,
 * adds a button straight into "already looked up" (see track-request-form.tsx's
 * auto-submit-on-load) so the customer doesn't have to retype what this
 * email already told them.
 */
export function customerEmailShell(title: string, bodyHtml: string, referenceNumber: string, trackingUrl?: string): string {
  return `
    <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 480px; margin: 0 auto;">
      <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #667085; margin: 0 0 8px;">Masterways</p>
      <h2 style="font-size: 18px; margin: 0 0 12px; color: #101828;">${title}</h2>
      ${bodyHtml}
      ${
        trackingUrl
          ? `<p style="margin-top: 20px;"><a href="${trackingUrl}" style="display: inline-block; background: #1d4e89; color: #fff; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 14px;">Track your request live</a></p>`
          : ""
      }
      <p style="margin-top: 20px; font-size: 12px; color: #667085;">Reference: ${referenceNumber}</p>
    </div>
  `;
}
