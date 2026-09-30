// One place for the Razorpay checkout flow, shared by the Paywall modal and
// the always-visible "Subscribe now" button above the chat composer
// (components/ChatPanel.jsx). Both used to need the exact same sequence —
// create order → open Razorpay → verify signature server-side → unlock —
// so it lives here rather than being copied.
//
// Nothing about access is decided client-side: /api/verify-payment checks
// the Razorpay signature and extends the subscription in the database, and
// the `access` object it returns is what the caller applies to the UI. So
// "pay karte hi access open" is exactly what happens — the moment the
// server verifies the payment, onUnlocked fires with the new access state.

export const MONTHLY_PRICE_INR = 199;

/**
 * Opens Razorpay for a 30-day subscription.
 *
 * @param {object} opts
 * @param {string}   [opts.name]      Prefills the customer name in checkout.
 * @param {function} opts.onUnlocked  Called with the fresh `access` object
 *                                    once the server has verified payment.
 * @param {function} [opts.onError]   Called with a user-facing message.
 * @param {function} [opts.onDismiss] Called if the customer closes checkout
 *                                    without paying.
 *
 * Rejects (throws) if checkout can't even be opened — order creation
 * failed, Razorpay script not loaded, etc. — so callers can reset their
 * loading state. Everything after `rzp.open()` reports via the callbacks.
 */
export async function startSubscriptionCheckout({ name, onUnlocked, onError, onDismiss }) {
  const orderRes = await fetch("/api/create-order", { method: "POST" });
  const order = await orderRes.json();
  if (!orderRes.ok) throw new Error(order.error || "Could not start payment.");

  if (typeof window.Razorpay === "undefined") {
    throw new Error("Payment isn't ready yet — please try again in a moment.");
  }

  const rzp = new window.Razorpay({
    key: order.keyId,
    amount: order.amount,
    currency: order.currency,
    order_id: order.orderId,
    name: "The Divine Tarot",
    description: "Ginni Ki Baatein — 30 day full access",
    theme: { color: "#6d28d9" },
    prefill: name ? { name } : undefined,
    handler: async function (response) {
      try {
        const verifyRes = await fetch("/api/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(response),
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok || !verifyData.verified) {
          throw new Error(verifyData.error || "Payment could not be verified.");
        }
        onUnlocked?.(verifyData.access);
      } catch (e) {
        onError?.(e.message || "Payment succeeded but verification failed. Contact support.");
      }
    },
    modal: {
      ondismiss: function () {
        onDismiss?.();
      },
    },
  });

  rzp.on("payment.failed", function () {
    onError?.("Payment failed — please try again.");
  });

  rzp.open();
}
