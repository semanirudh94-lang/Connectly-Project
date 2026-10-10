import cron from "node-cron";
import Subscription from "../models/Subscription.model.js";
import User from "../models/User.model.js";
import { getPlan } from "../config/plans.js";
import {
  sendPlanExpiredEmail,
  sendRenewalReminderEmail,
} from "../services/mailer.js";

// Renewal notices go out this far ahead of the renewal date.
const REMINDER_BEFORE_MS = 3 * 24 * 60 * 60 * 1000;

// Runs hourly: reminds users whose paid period is about to renew, then expires
// subscriptions whose period has ended and downgrades those users back to Free
// (1 post). resolveActivePlan() already treats a lapsed plan as Free lazily, but
// this job keeps the stored records accurate.
export const startSubscriptionExpiryJob = async () => {
  cron.schedule("0 * * * *", run);
  console.log("[subscriptionExpiry] scheduled hourly");
};

export const run = async () => {
  const now = new Date();

  try {
    const upcoming = await Subscription.find({
      status: { $in: ["active", "cancellation_scheduled"] },
      autoRenew: true,
      cancelAtPeriodEnd: false,
      renewalReminderSentAt: null,
      endDate: { $gt: now, $lte: new Date(now.getTime() + REMINDER_BEFORE_MS) },
    }).limit(100);

    for (const subscription of upcoming) {
      const user = await User.findById(subscription.user).select("email fullName");
      if (!user?.email) {
        subscription.renewalReminderSentAt = now;
        await subscription.save();
        continue;
      }
      try {
        const planDef = getPlan(subscription.plan);
        await sendRenewalReminderEmail({
          to: user.email,
          fullName: user.fullName,
          planName: planDef.name,
          amount: subscription.amount / 100,
          currency: subscription.currency,
          renewalDate: subscription.endDate,
        });
      } catch (mailErr) {
        console.log(`[subscriptionExpiry] reminder failed: ${mailErr.message}`);
      }
      subscription.renewalReminderSentAt = now;
      await subscription.save();
    }

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

    for (const subscription of expired) {
      if (subscription.expiryNoticeSentAt) continue;
      try {
        const user = await User.findById(subscription.user).select("email fullName");
        if (user?.email) {
          await sendPlanExpiredEmail({
            to: user.email,
            fullName: user.fullName,
            planName: getPlan(subscription.plan).name,
            endDate: subscription.endDate,
          });
        }
        // Re-apply the expiry from the bulk update so save() does not restore
        // the stale "active" status held in this document.
        subscription.status = "expired";
        subscription.expiryNoticeSentAt = new Date();
        await subscription.save();
      } catch (mailErr) {
        console.log(`[subscriptionExpiry] expiry notice failed: ${mailErr.message}`);
      }
    }

    console.log(
      `[subscriptionExpiry] expired ${expired.length} subscription(s), downgraded ${userIds.length} user(s) to Free`,
    );
  } catch (err) {
    console.log("[subscriptionExpiry] error:", err.message);
  }
};
