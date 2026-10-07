// Loads the Razorpay Checkout script on demand and opens the payment modal.
// In stub mode (backend has no Razorpay keys) the backend returns pre-signed
// ids, so we skip the popup entirely and resolve with those — letting the whole
// flow be tested locally without a Razorpay account.

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface OpenCheckoutArgs {
  keyId: string;
  amount: number; // paise
  currency: string;
  orderId: string;
  name: string;
  description: string;
  prefill: { name?: string; email?: string; contact?: string };
}

// Resolves with the success payload, or null if the user closed / it failed.
export function openRazorpayCheckout(
  args: OpenCheckoutArgs,
): Promise<RazorpaySuccess | null> {
  return new Promise((resolve) => {
    if (!window.Razorpay) {
      resolve(null);
      return;
    }
    const rzp = new window.Razorpay({
      key: args.keyId,
      amount: args.amount,
      currency: args.currency,
      name: args.name,
      description: args.description,
      order_id: args.orderId,
      prefill: args.prefill,
      theme: { color: "#0095f6" },
      handler: (response: RazorpaySuccess) => resolve(response),
      modal: { ondismiss: () => resolve(null) },
    });
    rzp.on("payment.failed", () => resolve(null));
    rzp.open();
  });
}
