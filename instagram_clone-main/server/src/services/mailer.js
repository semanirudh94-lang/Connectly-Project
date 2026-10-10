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

// Sends the payment invoice + subscription details after a successful charge.
// `amount` is in rupees (whole number); dates are formatted for the email body.
export async function sendInvoiceEmail({
  to,
  fullName = "there",
  planName,
  amount,
  currency = "INR",
  paymentId,
  orderId,
  startDate,
  endDate,
  nextRenewalDate,
  postLimit,
}) {
  const fmt = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—";
  const limitText =
    postLimit === null || postLimit === undefined || !Number.isFinite(postLimit)
      ? "Unlimited posts"
      : `Up to ${postLimit} posts`;

  const subject = `Your ${planName} plan receipt — InstAI`;
  const text = `Hi ${fullName},\n\nYour payment was successful. Here are your subscription details:\n\nPlan: ${planName}\nAmount: ${currency} ${amount}\nPosting limit: ${limitText}\nPayment ID: ${paymentId}\nOrder ID: ${orderId}\nValid from: ${fmt(startDate)}\nValid until: ${fmt(endDate)}\nNext renewal: ${fmt(nextRenewalDate)}\n\nThanks for upgrading!\n— InstAI`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px">
    <h2 style="margin:0 0 4px">InstAI</h2>
    <p style="color:#555;margin:0 0 20px">Payment receipt &amp; subscription details</p>
    <p style="margin:0 0 16px">Hi ${fullName}, your payment was successful. You're now on the <strong>${planName}</strong> plan.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${[
        ["Plan", planName],
        ["Amount paid", `${currency} ${amount}`],
        ["Posting limit", limitText],
        ["Payment ID", paymentId],
        ["Order ID", orderId],
        ["Valid from", fmt(startDate)],
        ["Valid until", fmt(endDate)],
        ["Next renewal", fmt(nextRenewalDate)],
      ]
        .map(
          ([k, v]) =>
            `<tr><td style="padding:8px;border-bottom:1px solid #f0f0f0;color:#888">${k}</td><td style="padding:8px;border-bottom:1px solid #f0f0f0;color:#111;font-weight:600;text-align:right">${v}</td></tr>`,
        )
        .join("")}
    </table>
    <p style="color:#999;font-size:12px;margin-top:20px">Keep this email as your invoice. Your plan renews on ${fmt(nextRenewalDate)}.</p>
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
      console.log(
        `\n[EMAIL STUB] Invoice for ${to} => ${planName} plan, ${currency} ${amount}, ` +
          `payment ${paymentId}, valid ${fmt(startDate)} → ${fmt(endDate)}, renews ${fmt(nextRenewalDate)} ` +
          `(set EMAIL_USER/EMAIL_PASS in .env to send real mail)\n`,
      );
      return { delivered: false, mode: "console" };
    }

    const preview = nodemailer.getTestMessageUrl?.(info);
    if (preview) console.log(`[mailer] invoice preview: ${preview}`);
    return { delivered: true, mode: "smtp" };
  } catch (error) {
    console.log("[mailer] invoice send failed:", error.message);
    throw error;
  }
}

// Notifies a user that their scheduled post has gone live (Task 6).
export async function sendPostPublishedEmail({
  to,
  fullName = "there",
  caption = "",
  scheduledFor,
  publishedAt,
}) {
  const fmt = (d) =>
    d
      ? new Date(d).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "—";
  const snippet = caption
    ? caption.length > 120
      ? `${caption.slice(0, 120)}…`
      : caption
    : "(no caption)";

  const subject = "Your scheduled post is now live — InstAI";
  const text = `Hi ${fullName},\n\nYour scheduled post has been published.\n\nScheduled for: ${fmt(scheduledFor)}\nPublished at: ${fmt(publishedAt)}\nCaption: ${snippet}\n\n— InstAI`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px">
    <h2 style="margin:0 0 4px">InstAI</h2>
    <p style="color:#555;margin:0 0 20px">Your scheduled post is now live</p>
    <p style="margin:0 0 16px">Hi ${fullName}, your post was published automatically as scheduled.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${[
        ["Scheduled for", fmt(scheduledFor)],
        ["Published at", fmt(publishedAt)],
        ["Caption", snippet],
      ]
        .map(
          ([k, v]) =>
            `<tr><td style="padding:8px;border-bottom:1px solid #f0f0f0;color:#888">${k}</td><td style="padding:8px;border-bottom:1px solid #f0f0f0;color:#111;font-weight:600;text-align:right">${v}</td></tr>`,
        )
        .join("")}
    </table>
    <p style="color:#999;font-size:12px;margin-top:20px">You're receiving this because you scheduled a post on InstAI.</p>
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
      console.log(
        `\n[EMAIL STUB] Post-published notice for ${to} => scheduled ${fmt(scheduledFor)}, published ${fmt(publishedAt)} ` +
          `(set EMAIL_USER/EMAIL_PASS in .env to send real mail)\n`,
      );
      return { delivered: false, mode: "console" };
    }

    const preview = nodemailer.getTestMessageUrl?.(info);
    if (preview) console.log(`[mailer] post-published preview: ${preview}`);
    return { delivered: true, mode: "smtp" };
  } catch (error) {
    console.log("[mailer] post-published send failed:", error.message);
    throw error;
  }
}
