"use client";

import { useState } from "react";

const MONTHLY_PRICE_INR = 199;

export default function Paywall({ name, onUnlocked }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubscribe() {
    setError(null);
    setLoading(true);
    try {
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
            setError(e.message || "Payment succeeded but verification failed. Contact support.");
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      });

      rzp.on("payment.failed", function () {
        setError("Payment failed — please try again.");
        setLoading(false);
      });

      rzp.open();
    } catch (e) {
      setError(e.message || "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="state-empty paywall">
      <svg className="glyph-big" viewBox="0 0 46 46" fill="none">
        <circle cx="23" cy="23" r="21" stroke="var(--gold)" strokeWidth="1" opacity="0.6" />
        <path d="M23 10 L27 20 L37 23 L27 26 L23 36 L19 26 L9 23 L19 20 Z" fill="var(--gold-soft)" opacity="0.85" />
      </svg>
      <h2>Your 3 free readings are used up</h2>
      <p>
        Ginni&rsquo;s got a lot more to say. Unlock unlimited readings, in any language, for{" "}
        <b style={{ color: "var(--gold-soft)" }}>₹{MONTHLY_PRICE_INR}/month</b>.
      </p>

      <button className="btn-gold paywall-btn" onClick={handleSubscribe} disabled={loading}>
        {loading ? "Opening payment…" : `Unlock full access — ₹${MONTHLY_PRICE_INR}`}
      </button>

      {error && <p className="prompt" style={{ color: "var(--rose)", marginTop: 14 }}>{error}</p>}

      <p className="paywall-fineprint">
        Secure payment via Razorpay. Unlocks all 15 questions, every language, for 30 days.
      </p>
    </div>
  );
}
