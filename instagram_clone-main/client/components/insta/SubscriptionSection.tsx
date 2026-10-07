"use client";

import { useEffect, useState } from "react";
import { Check, Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useLanguage } from "@/lib/LanguageProvider";
import { loadRazorpayScript, openRazorpayCheckout } from "@/lib/razorpay";
import {
  cancelSubscription,
  createSubscriptionOrder,
  fetchMySubscription,
  fetchPlans,
  verifySubscriptionPayment,
  type MySubscription,
  type Plan,
} from "@/lib/subscription.service";
import useAuthStore from "@/store/authStore";

const PLAN_ICON: Record<string, string> = {
  free: "🆓",
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
};

export default function SubscriptionSection() {
  const { t } = useLanguage();
  const user = useAuthStore((s) => s.user);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [sub, setSub] = useState<MySubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [plansRes, subRes] = await Promise.all([
        fetchPlans(),
        fetchMySubscription(),
      ]);
      setPlans(plansRes.plans);
      setSub(subRes);
    } catch {
      // Silent — the section just stays empty if the API is unreachable.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function subscribe(plan: Plan) {
    if (plan.id === "free") return;

    if (sub && !sub.paymentsOpen) {
      toast.add({ type: "error", title: t("subscription.windowClosed") });
      return;
    }

    setBusyPlan(plan.id);
    try {
      const order = await createSubscriptionOrder(plan.id as any);

      let payload;
      if (order.stub) {
        // No Razorpay keys configured — use the pre-signed stub ids.
        payload = {
          razorpay_order_id: order.orderId,
          razorpay_payment_id: order.stubPaymentId!,
          razorpay_signature: order.stubSignature!,
          plan: order.plan,
        };
      } else {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          toast.add({
            type: "error",
            title: t("subscription.checkoutFailed"),
          });
          setBusyPlan(null);
          return;
        }
        const result = await openRazorpayCheckout({
          keyId: order.keyId,
          amount: order.amount,
          currency: order.currency,
          orderId: order.orderId,
          name: t("app.name"),
          description: `${plan.name} — ${t("subscription.plan")}`,
          prefill: {
            name: user?.fullName || "",
            email: user?.email || "",
            contact: user?.phone || "",
          },
        });
        if (!result) {
          toast.add({ type: "error", title: t("subscription.paymentCancelled") });
          setBusyPlan(null);
          return;
        }
        payload = { ...result, plan: order.plan };
      }

      const verified = await verifySubscriptionPayment(payload as any);
      toast.add({ type: "success", title: verified.message });
      await load();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || t("subscription.somethingWrong");
      toast.add({ type: "error", title: msg });
    } finally {
      setBusyPlan(null);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      const res = await cancelSubscription();
      toast.add({ type: "success", title: res.message });
      await load();
    } catch (err: any) {
      toast.add({
        type: "error",
        title: err?.response?.data?.message || t("subscription.somethingWrong"),
      });
    } finally {
      setCancelling(false);
    }
  }

  const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString() : "—";

  return (
    <section className="bg-ig-surface border border-ig-border rounded-xl p-5 mt-4">
      <h2 className="text-base font-semibold text-ig-text flex items-center gap-2">
        <Crown size={18} className="text-[#0095f6]" />
        {t("subscription.title")}
      </h2>
      <p className="text-sm text-ig-muted mt-1 mb-5">
        {t("subscription.desc")}
      </p>

      {loading ? (
        <p className="text-sm text-ig-muted flex items-center gap-2">
          <Loader2 size={16} className="animate-spin" />
          {t("common.loading")}
        </p>
      ) : (
        <>
          {/* Payment window notice */}
          {sub && !sub.paymentsOpen && (
            <div className="mb-4 text-xs text-[#ed4956] bg-[#ed4956]/10 border border-[#ed4956]/20 rounded-lg px-3 py-2">
              {t("subscription.windowClosed")}
            </div>
          )}

          {/* Current plan summary */}
          {sub && (
            <div className="mb-5 rounded-lg border border-ig-border bg-ig-hover p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ig-text">
                  {t("subscription.currentPlan")}: {sub.planName}
                </span>
                {sub.cancelAtPeriodEnd && (
                  <span className="text-xs text-[#ed4956]">
                    {t("subscription.cancelling")}
                  </span>
                )}
              </div>
              <p className="text-xs text-ig-muted mt-1">
                {t("subscription.postsUsed", {
                  used: sub.used,
                  limit:
                    sub.limit === null ? t("subscription.unlimited") : sub.limit,
                })}
              </p>
              {sub.plan !== "free" && (
                <p className="text-xs text-ig-muted mt-0.5">
                  {t("subscription.validUntil")}: {fmtDate(sub.expiresAt)}
                  {" · "}
                  {t("subscription.renews")}: {fmtDate(sub.nextRenewalDate)}
                </p>
              )}
              {sub.plan !== "free" && !sub.cancelAtPeriodEnd && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="mt-3"
                  disabled={cancelling}
                  onClick={handleCancel}
                >
                  {cancelling ? t("common.loading") : t("subscription.cancelPlan")}
                </Button>
              )}
            </div>
          )}

          {/* Plan cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {plans.map((plan) => {
              const isCurrent = sub?.plan === plan.id;
              const isFree = plan.id === "free";
              const busy = busyPlan === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`rounded-lg border p-4 flex flex-col gap-2 ${
                    isCurrent ? "border-[#0095f6]" : "border-ig-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ig-text flex items-center gap-2">
                      <span>{PLAN_ICON[plan.id]}</span>
                      {plan.name}
                    </span>
                    {isCurrent && (
                      <span className="text-[11px] text-[#0095f6] flex items-center gap-1">
                        <Check size={13} /> {t("subscription.active")}
                      </span>
                    )}
                  </div>

                  <p className="text-lg font-bold text-ig-text">
                    {isFree
                      ? t("subscription.free")
                      : `₹${plan.price}`}
                    {!isFree && (
                      <span className="text-xs font-normal text-ig-muted">
                        /{t("subscription.month")}
                      </span>
                    )}
                  </p>

                  <p className="text-xs text-ig-muted">
                    {plan.limit === null
                      ? t("subscription.unlimitedPosts")
                      : t("subscription.upToPosts", { n: plan.limit })}
                  </p>

                  {!isFree && !isCurrent && (
                    <Button
                      className="mt-auto"
                      disabled={busy || !sub?.paymentsOpen}
                      onClick={() => subscribe(plan)}
                    >
                      {busy ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          {t("common.loading")}
                        </>
                      ) : (
                        t("subscription.subscribe")
                      )}
                    </Button>
                  )}
                  {isCurrent && (
                    <div className="mt-auto text-xs text-ig-muted py-1.5">
                      {t("subscription.yourCurrentPlan")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
