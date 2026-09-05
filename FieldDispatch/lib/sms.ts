import twilio from "twilio";

let client: ReturnType<typeof twilio> | null = null;

function getClient() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return null;
  if (!client) client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  return client;
}

/**
 * Sends a job-assignment SMS. Logs to console instead of sending when Twilio
 * isn't configured, or when the technician has opted out.
 */
export async function sendJobSms(opts: { to: string | null; optedOut: boolean; body: string }) {
  if (opts.optedOut || !opts.to) {
    console.log(`[sms] skipped (opted out or no phone): ${opts.body}`);
    return { sent: false, reason: opts.optedOut ? "opted_out" : "no_phone" };
  }

  const from = process.env.TWILIO_PHONE_NUMBER;
  const client = getClient();
  if (!client || !from) {
    console.log(`[sms:mock] to=${opts.to} body="${opts.body}"`);
    return { sent: false, reason: "twilio_not_configured" };
  }

  try {
    await client.messages.create({ to: opts.to, from, body: opts.body });
    return { sent: true };
  } catch (err) {
    console.error("[sms] Twilio send failed", err);
    return { sent: false, reason: "twilio_error" };
  }
}
