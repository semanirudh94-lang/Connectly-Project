import crypto from "crypto";

// Business rule: the payment gateway may only accept transactions between
// 5:00 AM and 11:00 AM IST, regardless of where the server physically runs.
// We therefore compute the wall-clock time in Asia/Kolkata rather than trusting
// the server's local timezone.
//
// The bounds can be moved for demos/local testing with PAYMENT_WINDOW_START_HOUR
// and PAYMENT_WINDOW_END_HOUR (24-hour integers). With no env set the rule is
// exactly the required 05:00–11:00 IST.

const DEFAULT_START_HOUR = 5;
const DEFAULT_END_HOUR = 11;

function readHour(name, fallback, max) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > max) {
    console.warn(`[payment] ignoring ${name}="${raw}" — expected 0-${max}`);
    return fallback;
  }
  return value;
}

export function paymentWindowBounds() {
  const startHour = readHour("PAYMENT_WINDOW_START_HOUR", DEFAULT_START_HOUR, 23);
  const endHour = readHour("PAYMENT_WINDOW_END_HOUR", DEFAULT_END_HOUR, 24);
  if (endHour <= startHour) {
    console.warn(
      `[payment] PAYMENT_WINDOW_START_HOUR=${startHour} >= PAYMENT_WINDOW_END_HOUR=${endHour} — falling back to the default 05:00-11:00 IST window`,
    );
    return { startHour: DEFAULT_START_HOUR, endHour: DEFAULT_END_HOUR };
  }
  return { startHour, endHour };
}

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
  const { startHour, endHour } = paymentWindowBounds();
  const { hour, minute } = istTimeParts(date);
  const total = hour * 60 + minute;
  return total >= startHour * 60 && total < endHour * 60;
}

function formatBoundary(hour) {
  if (hour === 24) return "midnight";
  const suffix = hour < 12 ? "AM" : "PM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:00 ${suffix}`;
}

// Presentable window string for error messages.
export function paymentWindowLabel() {
  const { startHour, endHour } = paymentWindowBounds();
  return `${formatBoundary(startHour)} and ${formatBoundary(endHour)} IST`;
}

export function paymentsClosedMessage() {
  return `Payments are currently unavailable. Transactions are accepted only between ${paymentWindowLabel()}. Please try again during that window.`;
}

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

// Razorpay webhooks sign the RAW request body with the webhook secret. The body
// must be verified before it is parsed, otherwise a forged POST could activate a
// plan without any money moving.
export function buildWebhookSignature(rawBody, webhookSecret) {
  return crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");
}

export function verifyWebhookSignature({ rawBody, signature, webhookSecret }) {
  if (!webhookSecret || !signature || !rawBody?.length) return false;
  const expected = Buffer.from(buildWebhookSignature(rawBody, webhookSecret));
  const received = Buffer.from(String(signature));
  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}
