import mongoose from "mongoose";

// A pending Chrome-login challenge. Created after credentials pass but before
// the email OTP is verified. Neither the OTP nor the challenge token is stored
// in plain text — only sha256 hashes. Retired (deleted) once verified or expired.
const loginSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    challengeTokenHash: { type: String, required: true, index: true },
    otpHash: { type: String, required: true },
    // Masked email shown in the UI (e.g. "se***@mail.com").
    target: { type: String, default: "" },
    // Snapshot of the login attempt, copied into LoginHistory on success.
    browser: { type: String, default: "Unknown" },
    os: { type: String, default: "Unknown" },
    deviceType: { type: String, default: "Unknown" },
    ip: { type: String, default: "" },
    // Linked LoginHistory record (status "pending") to flip to success later.
    historyId: { type: mongoose.Schema.Types.ObjectId, default: null },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    lockedUntil: { type: Date, default: null },
    verified: { type: Boolean, default: false },
    lastSentAt: { type: Date, default: Date.now },
    sendCount: { type: Number, default: 1 },
  },
  { timestamps: true },
);

// Auto-cleanup stale challenges.
loginSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("LoginSession", loginSessionSchema);
