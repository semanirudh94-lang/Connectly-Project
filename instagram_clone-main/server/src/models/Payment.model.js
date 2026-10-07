import mongoose from "mongoose";

// Every transaction attempt is logged here (pending → success/failed), so we
// keep accurate payment records even when a charge never completes.
const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ["bronze", "silver", "gold"],
      required: true,
    },
    orderId: { type: String, required: true, index: true },
    paymentId: { type: String, default: null },
    amount: { type: Number, required: true }, // in paise
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
      index: true,
    },
    signature: { type: String, default: null },
    failureReason: { type: String, default: null },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("Payment", paymentSchema);
