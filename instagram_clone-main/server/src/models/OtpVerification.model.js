import mongoose from "mongoose";

// Stores a pending language-change OTP. The OTP itself is never kept in plain
// text — only its sha256 hash. One active record per (user, targetLanguage).
const otpVerificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    otpHash: { type: String, required: true },
    channel: {
      type: String,
      enum: ["email", "sms"],
      required: true,
    },
    // Masked destination (e.g. "se***@mail.com" / "+1 ***567") for UI display.
    target: { type: String, default: "" },
    targetLanguage: {
      type: String,
      enum: ["en", "es", "hi", "pt", "zh", "fr"],
      required: true,
    },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    verified: { type: Boolean, default: false },
    lockedUntil: { type: Date, default: null },
    // Cooldown so the user cannot spam resends.
    lastSentAt: { type: Date, default: Date.now },
    sendCount: { type: Number, default: 1 },
  },
  { timestamps: true },
);

// Fast lookup + auto-cleanup of stale records.
otpVerificationSchema.index({ user: 1, targetLanguage: 1 });
otpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("OtpVerification", otpVerificationSchema);
