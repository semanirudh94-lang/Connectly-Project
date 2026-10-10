import OtpVerification from "../models/OtpVerification.model.js";
import User from "../models/User.model.js";
import {
  SUPPORTED_LANGUAGES,
  channelForLanguage,
  generateOtp,
  hashOtp,
  verifyOtpHash,
  otpExpiryDate,
  lockUntilDate,
  maskEmail,
  maskPhone,
  OTP_TTL_MS,
  RESEND_COOLDOWN_MS,
} from "../utils/otp.js";
import { sendOtpEmail } from "../services/mailer.js";
import { sendOtpSms } from "../services/sms.js";

const minutes = Math.round(OTP_TTL_MS / 60000);

// GET current language + which channels the account can use.
export const getLanguage = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("language email phone")
      .lean();
    res.status(200).json({
      success: true,
      language: user?.language || "en",
      hasEmail: Boolean(user?.email),
      hasPhone: Boolean(user?.phone),
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Resolve the destination for a channel. Returns { target, masked } or null.
function resolveTarget(user, channel) {
  if (channel === "email") {
    if (!user.email) return null;
    return { target: user.email, masked: maskEmail(user.email) };
  }
  if (!user.phone) return null;
  return { target: user.phone, masked: maskPhone(user.phone) };
}

// Create (or refresh) a pending OTP and dispatch it. Shared by request/resend.
async function issueOtp(user, language, existing) {
  const channel = channelForLanguage(language);
  const dest = resolveTarget(user, channel);
  if (!dest) {
    const err = new Error(
      channel === "email"
        ? "No email on your account to send a code."
        : "Add a mobile number in Edit Profile before switching to this language.",
    );
    err.status = 400;
    err.code = channel === "email" ? "no_email_on_account" : "no_phone_on_account";
    throw err;
  }

  const otp = generateOtp();
  const record = await OtpVerification.findOneAndUpdate(
    { user: user._id, targetLanguage: language },
    {
      $set: {
        otpHash: hashOtp(otp),
        channel,
        target: dest.masked,
        expiresAt: otpExpiryDate(),
        attempts: 0,
        verified: false,
        lockedUntil: null,
        lastSentAt: new Date(),
      },
      $inc: { sendCount: 1 },
      $setOnInsert: { user: user._id, targetLanguage: language },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  if (channel === "email") {
    await sendOtpEmail({ to: dest.target, otp, minutes });
  } else {
    await sendOtpSms({ to: dest.target, otp, minutes });
  }

  return { record, channel, masked: dest.masked };
}

// POST /api/language/otp  body: { language }
export const requestOtp = async (req, res) => {
  try {
    const { language } = req.body;
    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return res.status(400).json({
        success: false,
        code: "lang_unsupported",
        message: "Unsupported language",
      });
    }

    const user = await User.findById(req.user._id).select("email phone language");
    if (user.language === language) {
      return res.status(400).json({
        success: false,
        code: "lang_already_active",
        message: "You already use this language",
      });
    }

    // Respect an active lock or resend cooldown from a prior record.
    const existing = await OtpVerification.findOne({
      user: user._id,
      targetLanguage: language,
    });
    if (existing) {
      if (existing.lockedUntil && existing.lockedUntil > new Date()) {
        const wait = Math.ceil((existing.lockedUntil - new Date()) / 1000);
        return res.status(429).json({
          success: false,
          code: "otp_locked",
          message: `Too many failed attempts. Try again in ${wait}s.`,
          retryAfter: wait,
        });
      }
      const since = Date.now() - new Date(existing.lastSentAt).getTime();
      if (since < RESEND_COOLDOWN_MS) {
        const wait = Math.ceil((RESEND_COOLDOWN_MS - since) / 1000);
        return res.status(429).json({
          success: false,
          code: "otp_cooldown",
          message: `Please wait ${wait}s before requesting a new code.`,
          retryAfter: wait,
        });
      }
    }

    const { channel, masked } = await issueOtp(user, language, existing);
    res.status(200).json({
      success: true,
      channel,
      target: masked,
      expiresIn: minutes * 60,
      resendAfter: Math.round(RESEND_COOLDOWN_MS / 1000),
      code: "code_sent",
      message: `Code sent via ${channel}`,
    });
  } catch (error) {
    console.log(error);
    res
      .status(error.status || 500)
      .json({ success: false, code: error.code, message: error.message });
  }
};

// POST /api/language/otp/resend  body: { language }
export const resendOtp = async (req, res) => {
  try {
    const { language } = req.body;
    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return res.status(400).json({
        success: false,
        code: "lang_unsupported",
        message: "Unsupported language",
      });
    }
    const user = await User.findById(req.user._id).select("email phone language");

    const existing = await OtpVerification.findOne({
      user: user._id,
      targetLanguage: language,
    });
    if (!existing) {
      return res.status(404).json({
        success: false,
        code: "otp_no_pending",
        message: "No pending request. Ask for a code first.",
      });
    }
    if (existing.lockedUntil && existing.lockedUntil > new Date()) {
      const wait = Math.ceil((existing.lockedUntil - new Date()) / 1000);
      return res.status(429).json({
        success: false,
        code: "otp_locked",
        message: `Locked. Try again in ${wait}s.`,
        retryAfter: wait,
      });
    }
    const since = Date.now() - new Date(existing.lastSentAt).getTime();
    if (since < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESEND_COOLDOWN_MS - since) / 1000);
      return res.status(429).json({
        success: false,
        code: "otp_cooldown",
        message: `Please wait ${wait}s before resending.`,
        retryAfter: wait,
      });
    }

    const { channel, masked } = await issueOtp(user, language, existing);
    res.status(200).json({
      success: true,
      channel,
      target: masked,
      expiresIn: minutes * 60,
      resendAfter: Math.round(RESEND_COOLDOWN_MS / 1000),
      code: "code_resent",
      message: `Code resent via ${channel}`,
    });
  } catch (error) {
    console.log(error);
    res
      .status(error.status || 500)
      .json({ success: false, code: error.code, message: error.message });
  }
};

// POST /api/language/verify  body: { language, otp }
export const verifyOtp = async (req, res) => {
  try {
    const { language, otp } = req.body;
    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return res.status(400).json({
        success: false,
        code: "lang_unsupported",
        message: "Unsupported language",
      });
    }
    if (!otp) {
      return res.status(400).json({
        success: false,
        code: "otp_missing",
        message: "Enter the code",
      });
    }

    const record = await OtpVerification.findOne({
      user: req.user._id,
      targetLanguage: language,
    });
    if (!record || record.verified) {
      return res.status(400).json({
        success: false,
        code: "otp_no_active",
        message: "No active code. Request a new one.",
      });
    }
    if (record.lockedUntil && record.lockedUntil > new Date()) {
      const wait = Math.ceil((record.lockedUntil - new Date()) / 1000);
      return res.status(429).json({
        success: false,
        code: "otp_locked",
        message: `Too many failed attempts. Locked for ${wait}s.`,
        retryAfter: wait,
      });
    }
    if (record.expiresAt < new Date()) {
      await record.deleteOne();
      return res.status(400).json({
        success: false,
        code: "otp_expired",
        message: "Code expired. Request a new one.",
      });
    }

    // Count this attempt first, so failures are always recorded.
    record.attempts += 1;

    if (!verifyOtpHash(otp, record.otpHash)) {
      if (record.attempts >= record.maxAttempts) {
        record.lockedUntil = lockUntilDate();
        await record.save();
        return res.status(429).json({
          success: false,
          code: "otp_max_attempts",
          message: "Too many wrong attempts. Locked for 15 minutes.",
          retryAfter: Math.round(record.lockedUntil.getTime() / 1000),
          locked: true,
        });
      }
      await record.save();
      return res.status(400).json({
        success: false,
        code: "otp_wrong_code",
        message: `Wrong code. ${record.maxAttempts - record.attempts} attempt(s) left.`,
        attemptsLeft: record.maxAttempts - record.attempts,
      });
    }

    // Correct code — apply the language change and retire the record.
    record.verified = true;
    await record.save();
    await User.findByIdAndUpdate(req.user._id, { language });
    await record.deleteOne();

    res.status(200).json({
      success: true,
      language,
      code: "lang_updated",
      message: "Language updated",
    });
  } catch (error) {
    console.log(error);
    res
      .status(error.status || 500)
      .json({ success: false, code: error.code, message: error.message });
  }
};
