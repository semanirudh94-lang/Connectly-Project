import Post from "../models/Post.model.js";
import {
  getPlan,
  getPlanLimit,
  resolveActivePlan,
} from "../config/plans.js";

// Single source of truth for "how many posts has this user made in the current
// billing period, and how many does their active plan allow". Used by both the
// subscription controller (to display usage) and the post-limit middleware.
export async function computeUsage(user) {
  const activePlan = resolveActivePlan(user);
  const limit = getPlanLimit(activePlan);
  const periodStart = user.planPeriodStart || user.createdAt;

  const used = await Post.countDocuments({
    user: user._id,
    isDeleted: false,
    createdAt: { $gte: periodStart },
  });

  return {
    activePlan,
    planName: getPlan(activePlan).name,
    limit: Number.isFinite(limit) ? limit : null, // null = unlimited
    used,
    remaining: Number.isFinite(limit) ? Math.max(0, limit - used) : null,
  };
}

// Returns { allowed: true } or { allowed: false, status, message }.
export async function checkPostLimit(user) {
  const usage = await computeUsage(user);

  if (usage.limit === null) {
    return { allowed: true, usage }; // unlimited (Gold)
  }
  if (usage.used < usage.limit) {
    return { allowed: true, usage };
  }

  const message =
    usage.activePlan === "free"
      ? `The Free plan allows only ${usage.limit} post. Upgrade to Bronze, Silver or Gold to post more.`
      : `You've reached your ${usage.planName} plan limit of ${usage.limit} posts this period. Upgrade to post more.`;

  return { allowed: false, status: 403, message, usage };
}
