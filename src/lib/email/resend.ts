import "server-only";

const FROM = process.env.RESEND_FROM_EMAIL || "Masterways CRM <onboarding@resend.dev>";

/**
 * Thin wrapper over Resend's REST API — no SDK dependency needed for
 * something this small. Mirrors createNotification()'s contract: never
 * throws, since a failed email must not break the ticket action that
 * triggered it. No-ops (with a console warning) when RESEND_API_KEY isn't
 * set, same graceful-fallback pattern as the R2 storage backend.
 */
export async function sendEmail(input: { to: string; subject: string; html: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY not set — skipped email "${input.subject}" to ${input.to}`);
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from: FROM, to: input.to, subject: input.subject, html: input.html }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[email] Resend responded ${res.status} for "${input.subject}" to ${input.to}: ${body.slice(0, 300)}`);
    }
  } catch (err) {
    console.error(`[email] Failed to send "${input.subject}" to ${input.to}`, err);
  }
}
