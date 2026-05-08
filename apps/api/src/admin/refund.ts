/**
 * Admin CLI — process a refund for a purchase.
 *
 * Usage:
 *   bun apps/api/src/admin/refund.ts --orderId triangulate_starter_xyz --reason "30d refund window"
 *
 * Looks up the Payment by order_id, computes prorated refund amount,
 * revokes remaining credits, and records the refund.
 *
 * Wave 2 path: logs refund details for the founder to manually return
 * crypto to the customer's payout address.
 */
import { parseArgs } from "node:util";
import { sql, checkConnection, closeConnection } from "../db/client.js";

async function main() {
  const { values } = parseArgs({
    options: {
      orderId: { type: "string", short: "o" },
      reason: { type: "string", short: "r", default: "Manual refund" }
    }
  });

  const orderId = values.orderId?.trim();
  if (!orderId) {
    console.error("ERROR: --orderId is required.");
    process.exit(1);
  }

  console.log(`[REFUND] Connecting to database...`);
  const connected = await checkConnection();
  if (!connected) {
    console.error("ERROR: Cannot connect to database. Check DATABASE_URL.");
    process.exit(1);
  }

  console.log(`[REFUND] Looking up payment for order: ${orderId}`);

  const payments = await sql`
    SELECT
      p.id AS payment_id,
      p.pack_id,
      p.price_usd,
      p.credits,
      p.customer_id,
      p.payment_status,
      ca.id AS account_id,
      ca.balance AS current_balance,
      ca.status AS account_status,
      c.email AS customer_email
    FROM payments p
    LEFT JOIN credit_accounts ca ON ca.customer_id = p.customer_id
    LEFT JOIN customers c ON c.id = p.customer_id
    WHERE p.order_id = ${orderId}
    LIMIT 1
  `;

  const payment = payments[0] as Record<string, unknown> | undefined;
  if (!payment) {
    console.error(`ERROR: No payment found for order_id: ${orderId}`);
    process.exit(1);
  }

  if (payment.payment_status !== "finished" && payment.payment_status !== "confirmed") {
    console.error(`ERROR: Payment status is "${payment.payment_status}" — can only refund completed payments.`);
    process.exit(1);
  }

  if (!payment.account_id) {
    console.error("ERROR: No credit account linked to this payment.");
    process.exit(1);
  }

  const accountId = payment.account_id as string;
  const totalCredits = payment.credits as number;
  const priceUsd = Number(payment.price_usd);
  const currentBalance = payment.current_balance as number;
  const unusedCredits = currentBalance;
  const customerEmail = (payment.customer_email as string) ?? "unknown";

  if (currentBalance <= 0) {
    console.error("ERROR: No unused credits remaining. Nothing to refund.");
    process.exit(1);
  }

  const proratedUsd = Math.round((unusedCredits / totalCredits) * priceUsd * 100) / 100;

  console.log("");
  console.log("══════════════════════════════════════════════");
  console.log("  REFUND SUMMARY");
  console.log("══════════════════════════════════════════════");
  console.log(`  Order ID:     ${orderId}`);
  console.log(`  Customer:     ${customerEmail}`);
  console.log(`  Pack:         ${payment.pack_id}`);
  console.log(`  Total credits: ${totalCredits}`);
  console.log(`  Used credits:  ${totalCredits - unusedCredits}`);
  console.log(`  Unused:        ${unusedCredits}`);
  console.log(`  Price paid:    $${priceUsd.toFixed(2)}`);
  console.log(`  Prorated ref:  $${proratedUsd.toFixed(2)} (${Math.round((unusedCredits / totalCredits) * 100)}%)`);
  console.log(`  Reason:        ${values.reason}`);
  console.log("══════════════════════════════════════════════");
  console.log("");

  // Confirm before proceeding
  console.log("[REFUND] Proceeding with refund...");

  try {
    await sql.begin(async tx => {
      // Revoke remaining credits
      await tx`
        UPDATE credit_accounts
        SET balance = 0, status = 'refunded', updated_at = now()
        WHERE id = ${accountId}
      `;

      // Record the revocation transaction
      await tx`
        INSERT INTO credit_transactions (account_id, type, amount, balance_after, metadata)
        VALUES (${accountId}, 'refund', ${-unusedCredits}, 0, ${JSON.stringify({
          reason: values.reason,
          proratedUsd,
          orderId
        })})
      `;

      // Create refund record
      await tx`
        INSERT INTO refunds (payment_id, amount_usd, reason)
        VALUES (${payment.payment_id as string}, ${proratedUsd}, ${values.reason})
      `;

      // Update payment status
      await tx`
        UPDATE payments SET payment_status = 'refunded' WHERE id = ${payment.payment_id as string}
      `;
    });

    console.log("[REFUND] Refund processed successfully.");
    console.log(`[REFUND] ACTION REQUIRED: Manually return $${proratedUsd.toFixed(2)} USDT/USDC to ${customerEmail}'s payout address.`);
    console.log("[REFUND] Audit entry recorded in credit_transactions and refunds tables.");

  } catch (err) {
    console.error("[REFUND] Fatal error:", err);
    process.exit(1);
  } finally {
    await closeConnection();
  }
}

main();
