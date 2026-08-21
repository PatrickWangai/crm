import "server-only";
import { sendEmail } from "@/lib/email/resend";
import { emailShell } from "@/lib/email/templates";

/**
 * Fires once, right after any new account is created — the ICT-only
 * "Add user" flow (/admin/users) and every department's "My Team" flow
 * (createDepartmentTeamMember) both funnel through the same
 * createUserRecord, so this covers both without extra wiring. Puts the
 * login itself in the new hire's inbox instead of leaving it entirely on
 * whoever created the account to relay a password by hand — that's still
 * shown once in the UI too, as a fallback for when this doesn't land.
 */
export async function notifyNewAccount(user: { firstName: string; email: string }, roleName: string, tempPassword: string) {
  await sendEmail({
    to: user.email,
    subject: "Your Masterways CRM account is ready",
    html: emailShell(
      `Welcome, ${user.firstName}`,
      `<p style="color:#475467; font-size:14px; line-height:1.6;">An account has been created for you as <strong>${roleName}</strong>.</p>
       <p style="margin-top:14px; font-size:13px; color:#475467;">Sign in with:</p>
       <p style="margin-top:6px; font-size:14px;">Email: <strong>${user.email}</strong></p>
       <p style="margin-top:2px; font-size:14px;">Temporary password: <code style="background:#f2f4f7; padding:2px 6px; border-radius:4px; font-size:13px;">${tempPassword}</code></p>
       <p style="margin-top:14px; font-size:12px; color:#667085;">Change this password from your profile as soon as you sign in.</p>`,
      "/login",
      "Sign in",
    ),
  });
}
