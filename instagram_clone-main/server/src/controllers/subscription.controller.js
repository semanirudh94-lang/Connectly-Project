import User from "../models/User.model.js";
import Subscription from "../models/Subscription.model.js";
import Payment from "../models/Payment.model.js";
import {
  listPlans,
  getPlan,
  isValidPlan,
  planEndDate,
  PAID_PLAN_IDS,
} from "../config/plans.js";
import {
  createOrder as rzpCreateOrder,
  getPublicKey,
  getSignatureSecret,
  isRazorpayConfigured,
} from "../config/razorpay.js";
import {
  isWithinPaymentWindow,
  verifyRazorpaySignature,
  verifyWebhookSignature,
  paymentsClosedMessage,
} from "../utils/payment.js";
import { sendInvoiceEmail } from "../services/mailer.js";
import { computeUsage } from "../services/plan.service.js";

// GET /api/subscription/plans
export const getPlans = async (req, res) => {
  try {
    const usage = await computeUsage(req.user);
    res.status(200).json({
      success: true,
      plans: listPlans(),
      current: usage.activePlan,
      paymentsOpen: isWithinPaymentWindow(),
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/subscription/me
export const getMySubscription = async (req, res) => {
  try {
    const usage = await computeUsage(req.user);
    const subscription = await Subscription.findOne({
      user: req.user._id,
      status: { $in: ["active", "cancellation_scheduled"] },
    })
      .sort({ endDate: -1 })
      .lean();

    res.status(200).json({
      success: true,
      plan: usage.activePlan,
      planName: getPlan(usage.activePlan).name,
      limit: usage.limit,
      used: usage.used,
      remaining: usage.remaining,
      expiresAt: req.user.planExpiresAt,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
      nextRenewalDate: subscription?.nextRenewalDate || null,
      paymentsOpen: isWithinPaymentWindow(),
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/subscription/order  body: { plan }
export const createSubscriptionOrder = async (req, res) => {
  try {
    const { plan } = req.body;

    if (!isValidPlan(plan) || !PAID_PLAN_IDS.includes(plan)) {
      return res.status(400).json({
        success: false,
        code: "plan_invalid",
        message: "Choose a valid paid plan (bronze, silver or gold).",
      });
    }

    // Business rule — only accept payments inside the IST window.
    if (!isWithinPaymentWindow()) {
      return res.status(403).json({
        success: false,
        code: "payments_closed_window",
        message: paymentsClosedMessage(),
        paymentsOpen: false,
      });
    }

    const planDef = getPlan(plan);
    const order = await rzpCreateOrder({
      amountPaise: planDef.amountPaise,
      currency: planDef.currency,
      receipt: `rcpt_${Date.now()}`,
      notes: { plan, userId: String(req.user._id) },
    });

    // Log the attempt so we keep accurate records even if it never completes.
    await Payment.create({
      user: req.user._id,
      plan,
      orderId: order.id,
      amount: planDef.amountPaise,
      currency: planDef.currency,
      status: "pending",
    });

    res.status(200).json({
      success: true,
      keyId: getPublicKey(),
      stub: order.stub,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      plan,
      // Stub mode only: pre-signed ids so the local flow can be exercised
      // without a Razorpay account. Ignored when real keys are configured.
      stubPaymentId: order.stubPaymentId || null,
      stubSignature: order.stubSignature || null,
    });
  } catch (error) {
    console.log(error);
    res
      .status(error.status || 500)
      .json({ success: false, message: error.message });
  }
};

// Marks a payment as captured and opens the plan period. Shared by the browser
// verify flow and the Razorpay webhook so a plan is always activated identically.
async function activatePlan({ user, payment, orderId, paymentId, signature }) {
  const now = new Date();
  const endDate = planEndDate(payment.plan, now);

  payment.status = "success";
  payment.paymentId = paymentId;
  if (signature) payment.signature = signature;
  payment.paidAt = now;
  await payment.save();

  // Retire any previous active subscription, then record the new period.
  await Subscription.updateMany(
    { user: user._id, status: { $in: ["active", "cancellation_scheduled"] } },
    { $set: { status: "expired" } },
  );
  const subscription = await Subscription.create({
    user: user._id,
    plan: payment.plan,
    orderId,
    paymentId,
    amount: payment.amount,
    currency: payment.currency,
    status: "active",
    startDate: now,
    endDate,
    nextRenewalDate: endDate,
  });

  await User.findByIdAndUpdate(user._id, {
    plan: payment.plan,
    planExpiresAt: endDate,
    planPeriodStart: now,
  });

  // Invoice email — best effort; never fail the payment because mail failed.
  const planDef = getPlan(payment.plan);
  try {
    await sendInvoiceEmail({
      to: user.email,
      fullName: user.fullName,
      planName: planDef.name,
      amount: planDef.price,
      currency: planDef.currency,
      paymentId,
      orderId,
      startDate: now,
      endDate,
      nextRenewalDate: endDate,
      postLimit: Number.isFinite(planDef.limit) ? planDef.limit : null,
    });
  } catch (mailErr) {
    console.log("[subscription] invoice email failed:", mailErr.message);
  }

  return { subscription, endDate, planDef };
}

// POST /api/subscription/verify
// body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan }
export const verifyPayment = async (req, res) => {
  const {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
    plan,
  } = req.body;

  try {
    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({
        success: false,
        code: "payment_fields_missing",
        message: "Missing payment verification fields.",
      });
    }

    // Business rule — the window is re-checked here, not only at order creation,
    // so a plan can never be activated outside 5:00–11:00 AM IST. The attempt
    // stays "pending" so the user can finish it during an open window.
    if (!isWithinPaymentWindow()) {
      return res.status(403).json({
        success: false,
        code: "payments_closed_window",
        message: paymentsClosedMessage(),
        paymentsOpen: false,
      });
    }

    const payment = await Payment.findOne({ orderId, user: req.user._id });
    if (!payment) {
      return res.status(404).json({
        success: false,
        code: "order_not_found",
        message: "Order not found. Start the checkout again.",
      });
    }

    // Idempotent — a repeat verify for an already-paid order just returns ok.
    if (payment.status === "success") {
      return res.status(200).json({
        success: true,
        code: "payment_already_verified",
        message: "Payment already verified.",
        plan: plan || payment.plan,
      });
    }

    const valid = verifyRazorpaySignature({
      orderId,
      paymentId,
      signature,
      keySecret: getSignatureSecret(),
    });

    if (!valid) {
      payment.status = "failed";
      payment.paymentId = paymentId;
      payment.signature = signature;
      payment.failureReason = "Signature verification failed";
      await payment.save();
      return res.status(400).json({
        success: false,
        code: "payment_verification_failed",
        message: "Payment verification failed. You have not been charged.",
      });
    }

    // ── Payment is genuine — activate the plan ────────────────────────────
    if (plan && plan !== payment.plan) {
      payment.plan = plan;
    }
    const { endDate, planDef } = await activatePlan({
      user: req.user,
      payment,
      orderId,
      paymentId,
      signature,
    });

    res.status(200).json({
      success: true,
      message: `${planDef.name} plan activated. Invoice sent to your email.`,
      plan: payment.plan,
      planName: planDef.name,
      expiresAt: endDate,
      nextRenewalDate: endDate,
      stubMode: !isRazorpayConfigured(),
    });
  } catch (error) {
    console.log(error);
    // Record the failure against the order if we can identify it.
    if (orderId) {
      await Payment.updateOne(
        { orderId, status: "pending" },
        { $set: { status: "failed", failureReason: error.message } },
      ).catch(() => {});
    }
    res
      .status(error.status || 500)
      .json({ success: false, message: error.message });
  }
};

// POST /api/subscription/webhook
// Razorpay server-to-server events. Public (no session) but only accepted when
// the raw body carries a valid HMAC signed with RAZORPAY_WEBHOOK_SECRET.
export const razorpayWebhook = async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return res.status(503).json({
      success: false,
      message: "Webhook secret not configured. Set RAZORPAY_WEBHOOK_SECRET in .env.",
    });
  }

  const rawBody = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(JSON.stringify(req.body ?? ""));
  const signature = req.headers["x-razorpay-signature"];

  if (!verifyWebhookSignature({ rawBody, signature, webhookSecret })) {
    return res.status(400).json({ success: false, message: "Invalid webhook signature." });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return res.status(400).json({ success: false, message: "Unreadable webhook body." });
  }

  try {
    const entity = event?.payload?.payment?.entity;
    const orderId = entity?.order_id;

    if (event.event === "payment.captured" && orderId) {
      const payment = await Payment.findOne({ orderId });
      // Unknown or already-activated orders are acked so Razorpay stops retrying.
      if (payment && payment.status !== "success") {
        const user = await User.findById(payment.user).select("email fullName");
        if (user) {
          await activatePlan({
            user,
            payment,
            orderId,
            paymentId: entity.id,
          });
          console.log(`[webhook] activated ${payment.plan} for user ${user._id}`);
        }
      }
      return res.status(200).json({ success: true, received: true });
    }

    if (
      (event.event === "payment.failed" || event.event === "payment.payment_failed") &&
      orderId
    ) {
      await Payment.updateOne(
        { orderId, status: "pending" },
        {
          $set: {
            status: "failed",
            paymentId: entity?.id ?? null,
            failureReason:
              entity?.error_description || "Declined at the payment gateway",
          },
        },
      );
      return res.status(200).json({ success: true, received: true });
    }

    return res.status(200).json({ success: true, ignored: event?.event });
  } catch (error) {
    console.log("[webhook] error:", error.message);
    // 5xx makes Razorpay retry the event; activation is idempotent per payment.
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/subscription/cancel
export const cancelSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      user: req.user._id,
      status: { $in: ["active", "cancellation_scheduled"] },
    }).sort({ endDate: -1 });

    if (!subscription) {
      return res.status(400).json({
        success: false,
        code: "no_active_subscription",
        message: "No active subscription to cancel.",
      });
    }
    if (subscription.cancelAtPeriodEnd) {
      return res.status(200).json({
        success: true,
        code: "subscription_already_cancelled",
        message: "Your plan is already set to cancel at the end of the period.",
        cancelAtPeriodEnd: true,
        activeUntil: subscription.endDate,
      });
    }

    // End-of-period cancellation: keep the plan usable until endDate, but do
    // not renew it. The expiry job downgrades the user to Free afterwards.
    subscription.cancelAtPeriodEnd = true;
    subscription.status = "cancellation_scheduled";
    subscription.cancelledAt = new Date();
    await subscription.save();

    res.status(200).json({
      success: true,
      message: `Subscription cancelled. You can keep using ${getPlan(subscription.plan).name} until ${new Date(subscription.endDate).toLocaleDateString("en-IN", { dateStyle: "medium" })}.`,
      cancelAtPeriodEnd: true,
      activeUntil: subscription.endDate,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};
