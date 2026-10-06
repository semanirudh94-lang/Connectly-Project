import crypto from "crypto";

// OTP policy constants — tuned so the flow is secure but still testable by hand.
export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const MAX_ATTEMPTS = 5; // wrong tries before lock
export const LOCK_MS = 15 * 60 * 1000; // 15 minute lockout
export const RESEND_COOLDOWN_MS = 30 * 1000; // min gap between sends

export const SUPPORTED_LANGUAGES = ["en", "es", "hi", "pt", "zh", "fr"];

// French routes to email, every other language routes to SMS.
export const channelForLanguage = (lang) => (lang === "fr" ? "email" : "sms");

// Cryptographically-strong 6-digit code (never uses Math.random).
export function generateOtp() {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH;
  return String(crypto.randomInt(min, max));
}

export function hashOtp(otp) {
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
}

// Constant-time comparison so an attacker cannot time their way to the code.
export function verifyOtpHash(otp, otpHash) {
  const a = Buffer.from(hashOtp(otp));
  const b = Buffer.from(String(otpHash));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function otpExpiryDate() {
  return new Date(Date.now() + OTP_TTL_MS);
}

export function lockUntilDate() {
  return new Date(Date.now() + LOCK_MS);
}

export function maskEmail(email = "") {
  const [name, domain] = email.split("@");
  if (!domain) return "***";
  const head = name.slice(0, 2);
  return `${head}${"*".repeat(Math.max(1, name.length - 2))}@${domain}`;
}

export function maskPhone(phone = "") {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `+${digits.slice(0, digits.length - 4).replace(/./g, "*").slice(0, 3)} ***${digits.slice(-4)}`;
}
