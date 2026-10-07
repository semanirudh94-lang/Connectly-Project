import Razorpay from "razorpay";
import crypto from "crypto";
import { buildRazorpaySignature } from "../utils/payment.js";

// Razorpay client with a zero-config "stub" fallback.
//
// Real mode: set RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET in .env (test-mode keys
// from the Razorpay dashboard are free). Orders are created through the SDK and
// payments are verified against your real key secret.
//
// Stub mode: when the keys are missing we still let the whole flow run locally
// — a fake order + payment id are generated and signed with a fixed dev secret,
// so signature verification exercises the exact same code path. Anything signed
// in stub mode is clearly flagged and logged; never enable stub in production.

const STUB_SECRET = "stub_dev_secret_do_not_use_in_prod";

let cachedClient;
let cachedConfigured;

export function isRazorpayConfigured() {
  if (cachedConfigured !== undefined) return cachedConfigured;
  cachedConfigured = Boolean(
    process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET,
  );
  return cachedConfigured;
}

// The secret used to verify signatures — real key secret, or the dev stub one.
export function getSignatureSecret() {
  return isRazorpayConfigured()
    ? process.env.RAZORPAY_KEY_SECRET
    : STUB_SECRET;
}

// Public key id the browser needs to open Razorpay Checkout. Empty in stub mode.
export function getPublicKey() {
  return process.env.RAZORPAY_KEY_ID || "";
}

function getClient() {
  if (cachedClient) return cachedClient;
  cachedClient = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  return cachedClient;
}

// Create an order for the given amount (in paise). Returns a normalised shape
// so the controller does not need to know whether we are in stub mode.
export async function createOrder({ amountPaise, currency, receipt, notes }) {
  if (!isRazorpayConfigured()) {
    const orderId = `order_stub_${crypto.randomBytes(8).toString("hex")}`;
    const paymentId = `pay_stub_${crypto.randomBytes(8).toString("hex")}`;
    const signature = buildRazorpaySignature(orderId, paymentId, STUB_SECRET);
    console.log(
      `\n[RAZORPAY STUB] order ${orderId} for ₹${(amountPaise / 100).toFixed(2)} ` +
        `(set RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET in .env for real payments)\n`,
    );
    return {
      stub: true,
      id: orderId,
      amount: amountPaise,
      currency,
      receipt,
      stubPaymentId: paymentId,
      stubSignature: signature,
    };
  }

  const order = await getClient().orders.create({
    amount: amountPaise,
    currency,
    receipt,
    payment_capture: 1,
    notes: notes || {},
  });

  return {
    stub: false,
    id: order.id,
    amount: order.amount,
    currency: order.currency,
    receipt: order.receipt,
  };
}
