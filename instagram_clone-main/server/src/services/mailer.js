import nodemailer from "nodemailer";

// Sends the language-change OTP over email.
//
// Free-tier setup (recommended for testing):
//   1. Turn on 2-Step Verification for your Gmail account.
//   2. Create an App Password (Google Account → Security → App passwords).
//   3. Put EMAIL_USER=you@gmail.com and EMAIL_PASS=<16-char app password> in .env
//
// If those are missing we fall back to printing the code in the server console
// so local development still works with zero configuration.
let cachedTransporter = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (user && pass) {
    cachedTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
    return cachedTransporter;
  }

  // No credentials — a "stub" transporter just resolves without sending.
  cachedTransporter = { sendMail: async (opts) => ({ stub: true, opts }) };
  return cachedTransporter;
}

export async function sendOtpEmail({ to, otp, minutes = 5 }) {
  const subject = "Your InstAI verification code";
  const text = `Your InstAI verification code is ${otp}. It expires in ${minutes} minutes. If you did not request this, ignore it.`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px">
    <h2 style="margin:0 0 8px">InstAI</h2>
    <p style="color:#555;margin:0 0 16px">Use this code to confirm your language change:</p>
    <div style="font-size:32px;letter-spacing:8px;font-weight:bold;text-align:center;background:#f7f7f7;padding:16px;border-radius:8px">${otp}</div>
    <p style="color:#999;font-size:12px;margin-top:16px">Expires in ${minutes} minutes. Ignore if you didn't request it.</p>
  </div>`;

  const transporter = getTransporter();

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER || "no-reply@instai.local",
      to,
      subject,
      text,
      html,
    });

    if (info?.stub) {
      console.log(`\n[EMAIL STUB] OTP for ${to} => ${otp} (set EMAIL_USER/EMAIL_PASS in .env to send real mail)\n`);
      return { delivered: false, mode: "console" };
    }

    const preview = nodemailer.getTestMessageUrl?.(info);
    if (preview) console.log(`[mailer] preview: ${preview}`);
    return { delivered: true, mode: "smtp" };
  } catch (error) {
    console.log("[mailer] send failed:", error.message);
    throw error;
  }
}
