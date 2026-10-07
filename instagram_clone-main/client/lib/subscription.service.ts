import axiosInstance from "@/lib/axios";

export type PlanId = "free" | "bronze" | "silver" | "gold";

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  currency: string;
  limit: number | null; // null = unlimited
  intervalDays: number;
}

export interface PlansResponse {
  plans: Plan[];
  current: PlanId;
  paymentsOpen: boolean;
}

export interface MySubscription {
  plan: PlanId;
  planName: string;
  limit: number | null;
  used: number;
  remaining: number | null;
  expiresAt: string | null;
  cancelAtPeriodEnd: boolean;
  nextRenewalDate: string | null;
  paymentsOpen: boolean;
}

export interface OrderResponse {
  keyId: string;
  stub: boolean;
  orderId: string;
  amount: number;
  currency: string;
  plan: PlanId;
  stubPaymentId: string | null;
  stubSignature: string | null;
}

export interface VerifyResponse {
  plan: PlanId;
  planName: string;
  expiresAt: string;
  nextRenewalDate: string;
  message: string;
  stubMode?: boolean;
}

export async function fetchPlans(): Promise<PlansResponse> {
  const res = await axiosInstance.get("/api/subscription/plans");
  return res.data;
}

export async function fetchMySubscription(): Promise<MySubscription> {
  const res = await axiosInstance.get("/api/subscription/me");
  return res.data;
}

export async function createSubscriptionOrder(
  plan: PlanId,
): Promise<OrderResponse> {
  const res = await axiosInstance.post("/api/subscription/order", { plan });
  return res.data;
}

export async function verifySubscriptionPayment(payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  plan: PlanId;
}): Promise<VerifyResponse> {
  const res = await axiosInstance.post("/api/subscription/verify", payload);
  return res.data;
}

export async function cancelSubscription(): Promise<{
  message: string;
  cancelAtPeriodEnd: boolean;
  activeUntil?: string;
}> {
  const res = await axiosInstance.post("/api/subscription/cancel");
  return res.data;
}
