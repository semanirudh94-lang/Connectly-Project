import mongoose from "mongoose";

// Audit log of every login attempt (successful AND failed) for a user. Shown in
// the profile's "Login History" section.
const loginHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    browser: { type: String, default: "Unknown" },
    os: { type: String, default: "Unknown" },
    deviceType: {
      type: String,
      enum: ["Desktop", "Tablet", "Mobile", "Unknown"],
      default: "Unknown",
    },
    ip: { type: String, default: "" },
    status: {
      type: String,
      enum: [
        "success",
        "failed", // bad credentials
        "otp_failed", // wrong OTP during Chrome verification
        "denied_window", // mobile login outside the allowed time window
        "pending", // Chrome login awaiting OTP
      ],
      required: true,
      index: true,
    },
    failureReason: { type: String, default: "" },
    loginAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

loginHistorySchema.index({ user: 1, loginAt: -1 });

export default mongoose.model("LoginHistory", loginHistorySchema);
