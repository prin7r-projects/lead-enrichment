/**
 * Email dispatch.
 *
 * Wave 2 path: logs to console (founder hand-delivery).
 * Wave 3 path: integrates Resend or AWS SES when SMTP env vars are set.
 */

interface EmailParams {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Send a transactional email. In Wave 2, logs to console.
 * When SMTP env vars are configured, sends via SMTP.
 */
export async function sendEmail(params: EmailParams): Promise<void> {
  const smtpHost = process.env.SMTP_HOST?.trim();

  if (!smtpHost) {
    // Wave 2: founder hand-delivery path
    console.log("[EMAIL] ========================================");
    console.log(`[EMAIL] TO: ${params.to}`);
    console.log(`[EMAIL] SUBJECT: ${params.subject}`);
    console.log(`[EMAIL] TEXT: ${params.text.slice(0, 500)}`);
    console.log("[EMAIL] ========================================");
    return;
  }

  // Wave 3: actual SMTP delivery
  // TODO: integrate nodemailer or similar
  console.log(`[EMAIL] SMTP delivery to ${params.to} — SMTP configured but not yet implemented`);
}

/**
 * Send the API key issuance email.
 */
export async function sendApiKeyEmail(
  to: string,
  rawKey: string,
  packName: string
): Promise<void> {
  const subject = `Your Triangulate API key — ${packName} pack`;
  const text = [
    `Thank you for purchasing the Triangulate ${packName} pack!`,
    "",
    `Your API key: ${rawKey}`,
    "",
    "Save this key somewhere secure. For security, we cannot show it again.",
    "",
    "Try it now:",
    `curl -X POST https://lead-enrichment.prin7r.com/v1/enrich \\`,
    `  -H 'content-type: application/json' \\`,
    `  -H 'authorization: Bearer ${rawKey}' \\`,
    `  -d '{"email":"jane.doe@stripe.com"}'`,
    "",
    "Documentation: https://lead-enrichment.prin7r.com",
    "Dashboard:    https://lead-enrichment.prin7r.com/dashboard",
    "",
    "— The Triangulate team"
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 16px; color: #061B31;">
  <h1 style="font-weight: 600; font-size: 20px; color: #533AFD;">Triangulate</h1>
  <p>Thank you for purchasing the <strong>${packName}</strong> pack!</p>
  <div style="background: #F8FAFD; border: 1px solid #E5EDF5; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="font-family: 'IBM Plex Mono', monospace; font-size: 13px; word-break: break-all; margin: 0;">
      <strong>Your API key:</strong><br/>
      ${rawKey}
    </p>
  </div>
  <p style="font-size: 13px; color: #50617A;">Save this key somewhere secure. For security, we cannot show it again.</p>
  <h2 style="font-size: 16px; margin-top: 24px;">Try it now</h2>
  <pre style="background: #F8FAFD; border: 1px solid #E5EDF5; border-radius: 8px; padding: 16px; font-family: 'IBM Plex Mono', monospace; font-size: 13px; overflow-x: auto;">
curl -X POST https://lead-enrichment.prin7r.com/v1/enrich \\
  -H 'content-type: application/json' \\
  -H 'authorization: Bearer ${rawKey}' \\
  -d '{"email":"jane.doe@stripe.com"}'</pre>
  <p style="font-size: 13px; color: #50617A;">
    <a href="https://lead-enrichment.prin7r.com" style="color: #533AFD;">Documentation</a> · 
    <a href="https://lead-enrichment.prin7r.com/dashboard" style="color: #533AFD;">Dashboard</a>
  </p>
  <hr style="border: none; border-top: 1px solid #E5EDF5; margin: 32px 0 16px;">
  <p style="font-size: 12px; color: #64748D;">— The Triangulate team</p>
</body>
</html>`;

  await sendEmail({ to, subject, text, html });
}
