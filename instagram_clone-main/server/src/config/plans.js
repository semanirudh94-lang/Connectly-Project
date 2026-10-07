// Subscription plan catalogue — the single source of truth for pricing and
// posting limits. Prices are in whole rupees; Razorpay works in the smallest
// currency unit (paise), so `amountPaise` is what we charge.

export const PLANS = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    amountPaise: 0,
    currency: "INR",
    limit: 1,
    intervalDays: 0,
  },
  bronze: {
    id: "bronze",
    name: "Bronze",
    price: 100,
    amountPaise: 100 * 100,
    currency: "INR",
    limit: 3,
    intervalDays: 30,
  },
  silver: {
    id: "silver",
    name: "Silver",
    price: 300,
    amountPaise: 300 * 100,
    currency: "INR",
    limit: 5,
    intervalDays: 30,
  },
  gold: {
    id: "gold",
    name: "Gold",
    price: 1000,
    amountPaise: 1000 * 100,
    currency: "INR",
    limit: Infinity,
    intervalDays: 30,
  },
};

export const PLAN_IDS = Object.keys(PLANS);
export const PAID_PLAN_IDS = PLAN_IDS.filter((id) => id !== "free");

export function isValidPlan(id) {
  return typeof id === "string" && id in PLANS;
}

export function getPlan(id) {
  return PLANS[id] || PLANS.free;
}

// Public-facing list for the pricing UI (Infinity does not serialise to JSON,
// so expose the limit as `null` to mean "unlimited").
export function listPlans() {
  return PLAN_IDS.map((id) => {
    const p = PLANS[id];
    return {
      id: p.id,
      name: p.name,
      price: p.price,
      currency: p.currency,
      limit: Number.isFinite(p.limit) ? p.limit : null,
      intervalDays: p.intervalDays,
    };
  });
}

export function getPlanLimit(id) {
  return getPlan(id).limit;
}

// Work out which plan actually applies right now. A paid plan whose validity
// has lapsed is treated as Free until the user renews.
export function resolveActivePlan(user) {
  const now = new Date();
  const plan = user?.plan || "free";
  if (plan === "free") return "free";
  if (user?.planExpiresAt && new Date(user.planExpiresAt) < now) return "free";
  return plan;
}

// Human-readable end of the validity period for a freshly-activated plan.
export function planEndDate(planId, from = new Date()) {
  const days = getPlan(planId).intervalDays || 30;
  const end = new Date(from);
  end.setDate(end.getDate() + days);
  return end;
}
