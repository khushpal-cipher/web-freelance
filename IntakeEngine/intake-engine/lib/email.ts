import { Resend } from "resend";
import { logger } from "./logger";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM ?? "IntakeEngine <onboarding@resend.dev>";

export async function sendWelcomeEmail(to: string, businessName: string): Promise<boolean> {
  if (!resend) {
    logger.info("email.skipped_no_key", { to: redact(to) });
    return false;
  }
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Welcome aboard, ${businessName}`,
      html: `<p>Hi ${escapeHtml(businessName)},</p><p>Your account has been provisioned. We'll be in touch shortly with next steps.</p>`,
    });
    logger.info("email.sent", { to: redact(to) });
    return true;
  } catch (err) {
    logger.error("email.failed", { to: redact(to) });
    return false;
  }
}

function redact(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "***";
  return `${user.slice(0, 1)}***@${domain}`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
