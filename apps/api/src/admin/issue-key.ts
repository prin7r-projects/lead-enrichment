/**
 * Admin CLI — issue a pilot API key with a fixed number of credits.
 *
 * Usage:
 *   bun apps/api/src/admin/issue-key.ts --email hannah@example.com --credits 50 --label "pilot-may-2026"
 *
 * Creates a Customer + CreditAccount + ApiKey. The raw API key is
 * printed to stdout once (for the founder to email manually).
 * Every issuance is logged with operator email, timestamp, and reason.
 */
import { parseArgs } from "node:util";
import { createCustomerWithKey } from "../auth/index.js";
import { grantCredits } from "../ledger/index.js";
import { sendApiKeyEmail } from "../email/index.js";
import { checkConnection, closeConnection } from "../db/client.js";
import { migrate } from "../db/migrate.js";

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: "string", short: "e" },
      credits: { type: "string", short: "c" },
      label: { type: "string", short: "l", default: "pilot" },
      reason: { type: "string", short: "r", default: "manual pilot issuance" }
    }
  });

  const email = values.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    console.error("ERROR: --email is required and must be a valid email address.");
    process.exit(1);
  }

  const credits = parseInt(values.credits ?? "0", 10);
  if (!credits || credits < 1) {
    console.error("ERROR: --credits must be a positive integer.");
    process.exit(1);
  }

  const label = values.label ?? "pilot";

  // Connect to DB
  console.log("[ISSUE_KEY] Connecting to database...");
  const connected = await checkConnection();
  if (!connected) {
    console.error("ERROR: Cannot connect to database. Check DATABASE_URL.");
    process.exit(1);
  }

  // Run migrations
  console.log("[ISSUE_KEY] Running migrations...");
  await migrate();

  console.log(`[ISSUE_KEY] Creating customer: ${email}`);
  console.log(`[ISSUE_KEY] Credits: ${credits}, Label: ${label}`);

  try {
    const result = await createCustomerWithKey({
      email,
      credits: 0,
      label
    });

    await grantCredits({
      accountId: result.accountId,
      amount: credits,
      type: "admin_grant",
      correlationId: `admin_issue_${Date.now().toString(36)}`,
      metadata: {
        reason: values.reason,
        label,
        operator: "admin_cli"
      }
    });

    console.log("");
    console.log("══════════════════════════════════════════════");
    console.log("  PILOT KEY ISSUED");
    console.log("══════════════════════════════════════════════");
    console.log(`  Customer ID:  ${result.customerId}`);
    console.log(`  Account ID:   ${result.accountId}`);
    console.log(`  Key ID:       ${result.keyId}`);
    console.log(`  Email:        ${email}`);
    console.log(`  Credits:      ${credits}`);
    console.log(`  Label:        ${label}`);
    console.log(`  API Key:      ${result.rawKey}`);
    console.log("══════════════════════════════════════════════");
    console.log("");
    console.log("Copy the API key above and send it to the customer.");
    console.log("The key is NOT stored in plaintext — this is the only time you'll see it.");
    console.log("");

    // Attempt to send email
    console.log("[ISSUE_KEY] Sending API key email...");
    await sendApiKeyEmail(email, result.rawKey, "Pilot");

    // Log audit entry
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action: "issue_pilot_key",
      operator: "admin_cli",
      customerId: result.customerId,
      accountId: result.accountId,
      keyId: result.keyId,
      email,
      credits,
      label,
      reason: values.reason
    };
    console.log("[ISSUE_KEY] Audit log:", JSON.stringify(auditEntry, null, 2));

  } catch (err) {
    console.error("[ISSUE_KEY] Fatal error:", err);
    process.exit(1);
  } finally {
    await closeConnection();
  }
}

main();
