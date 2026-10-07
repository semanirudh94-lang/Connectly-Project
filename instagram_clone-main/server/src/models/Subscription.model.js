import mongoose from "mongoose";

// One document per purchased membership period. Free users simply have no
// active Subscription record. Kept separate from Payment (which logs every
// transaction attempt, including failures) so the subscription history stays
// clean and auditable.
const subscriptionSchema = new mongoose.Schema(
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
    orderId: { type: String, required: true },
    paymentId: { type: String, required: true },
    amount: { type: Number, required: true }, // in paise
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled", "cancellation_scheduled"],
      default: "active",
      index: true,
    },
    startDate: { type: Date, required: true, default: Date.now },
    endDate: { type: Date, required: true },
    nextRenewalDate: { type: Date, required: true },
    // True once the user asks to cancel; plan stays usable until endDate.
    cancelAtPeriodEnd: { type: Boolean, default: false },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true },
);

subscriptionSchema.index({ user: 1, status: 1, endDate: -1 });

export default mongoose.model("Subscription", subscriptionSchema);
