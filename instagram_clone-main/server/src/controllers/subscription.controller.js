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
  PAYMENTS_CLOSED_MESSAGE,
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
        message: "Choose a valid paid plan (bronze, silver or gold).",
      });
    }

    // Business rule — only accept payments inside the IST window.
    if (!isWithinPaymentWindow()) {
      return res.status(403).json({
        success: false,
        message: PAYMENTS_CLOSED_MESSAGE,
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
        message: "Missing payment verification fields.",
      });
    }

    const payment = await Payment.findOne({ orderId });
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Order not found. Start the checkout again.",
      });
    }

    // Idempotent — a repeat verify for an already-paid order just returns ok.
    if (payment.status === "success") {
      return res.status(200).json({
        success: true,
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
        message: "Payment verification failed. You have not been charged.",
      });
    }

    // ── Payment is genuine — activate the plan ────────────────────────────
    const activePlan = plan || payment.plan;
    const now = new Date();
    const endDate = planEndDate(activePlan, now);

    payment.status = "success";
    payment.paymentId = paymentId;
    payment.signature = signature;
    payment.paidAt = now;
    await payment.save();

    // Retire any previous active subscription, then record the new period.
    await Subscription.updateMany(
      { user: req.user._id, status: { $in: ["active", "cancellation_scheduled"] } },
      { $set: { status: "expired" } },
    );
    const subscription = await Subscription.create({
      user: req.user._id,
      plan: activePlan,
      orderId,
      paymentId,
      amount: payment.amount,
      currency: payment.currency,
      status: "active",
      startDate: now,
      endDate,
      nextRenewalDate: endDate,
    });

    await User.findByIdAndUpdate(req.user._id, {
      plan: activePlan,
      planExpiresAt: endDate,
      planPeriodStart: now,
    });

    // Invoice email — best effort; never fail the payment because mail failed.
    const planDef = getPlan(activePlan);
    try {
      await sendInvoiceEmail({
        to: req.user.email,
        fullName: req.user.fullName,
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

    res.status(200).json({
      success: true,
      message: `${planDef.name} plan activated. Invoice sent to your email.`,
      plan: activePlan,
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
        message: "No active subscription to cancel.",
      });
    }
    if (subscription.cancelAtPeriodEnd) {
      return res.status(200).json({
        success: true,
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
