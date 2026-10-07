import crypto from "crypto";

// Business rule: the payment gateway may only accept transactions between
// 5:00 AM and 11:00 AM IST, regardless of where the server physically runs.
// We therefore compute the wall-clock time in Asia/Kolkata rather than trusting
// the server's local timezone.

const WINDOW_START_MINUTES = 5 * 60; // 05:00
const WINDOW_END_MINUTES = 11 * 60; // 11:00 (exclusive)

// Returns { hour, minute } for the given Date expressed in IST.
function istTimeParts(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);

  const get = (type) => {
    const found = parts.find((p) => p.type === type);
    return found ? parseInt(found.value, 10) : 0;
  };

  // Intl can return "24" for midnight in hour12:false; normalise to 0.
  const hour = get("hour") % 24;
  const minute = get("minute");
  return { hour, minute };
}

export function isWithinPaymentWindow(date = new Date()) {
  const { hour, minute } = istTimeParts(date);
  const total = hour * 60 + minute;
  return total >= WINDOW_START_MINUTES && total < WINDOW_END_MINUTES;
}

// Presentable window string for error messages.
export function paymentWindowLabel() {
  return "5:00 AM and 11:00 AM IST";
}

export const PAYMENTS_CLOSED_MESSAGE = `Payments are currently unavailable. Transactions are accepted only between ${paymentWindowLabel()}. Please try again during that window.`;

// Razorpay signature verification (secure payment verification).
// signature == HMAC_SHA256(`${order_id}|${payment_id}`, keySecret)
export function buildRazorpaySignature(orderId, paymentId, keySecret) {
  return crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
}

export function verifyRazorpaySignature({
  orderId,
  paymentId,
  signature,
  keySecret,
}) {
  const expected = buildRazorpaySignature(orderId, paymentId, keySecret);
  const a = Buffer.from(String(expected));
  const b = Buffer.from(String(signature || ""));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
