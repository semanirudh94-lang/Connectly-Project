import cron from "node-cron";
import Subscription from "../models/Subscription.model.js";
import User from "../models/User.model.js";

// Runs hourly: expires paid subscriptions whose period has ended and downgrades
// those users back to the Free plan (1 post). resolveActivePlan() already treats
// a lapsed plan as Free lazily, but this job keeps the stored records accurate.
export const startSubscriptionExpiryJob = () => {
  cron.schedule("0 * * * *", async () => {
    try {
      const now = new Date();

      const expired = await Subscription.find({
        status: { $in: ["active", "cancellation_scheduled"] },
        endDate: { $lte: now },
      });

      if (expired.length === 0) return;

      await Subscription.updateMany(
        { _id: { $in: expired.map((s) => s._id) } },
        { $set: { status: "expired" } },
      );

      const userIds = [...new Set(expired.map((s) => String(s.user)))];
      await User.updateMany(
        { _id: { $in: userIds }, plan: { $ne: "free" } },
        { $set: { plan: "free", planExpiresAt: null } },
      );

      console.log(
        `[subscriptionExpiry] expired ${expired.length} subscription(s), downgraded ${userIds.length} user(s) to Free`,
      );
    } catch (err) {
      console.log("[subscriptionExpiry] error:", err.message);
    }
  });
  console.log("[subscriptionExpiry] scheduled hourly");
};
