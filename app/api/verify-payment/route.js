import crypto from "crypto";
import { NextResponse } from "next/server";
import { getSessionUser, summarizeAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// The client sends back what Razorpay's checkout gave it after payment.
// We re-derive the signature server-side with the key secret and compare —
// this is the step that actually proves the payment is real, not spoofed.
// The subscription is only ever granted here, server-side, tied to the
// order we already recorded for this specific logged-in user.
export async function POST(req) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  if (!process.env.RAZORPAY_KEY_SECRET) {
    return NextResponse.json({ error: "Payments aren't configured yet." }, { status: 500 });
  }

  const body = await req.json();
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body || {};

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing payment fields." }, { status: 400 });
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return NextResponse.json({ error: "Signature mismatch — payment could not be verified." }, { status: 400 });
  }

  try {
    const order = await prisma.order.findUnique({ where: { razorpayOrderId: razorpay_order_id } });
    if (!order || order.userId !== user.id) {
      return NextResponse.json({ error: "This order doesn't belong to your account." }, { status: 403 });
    }
    if (order.status === "paid") {
      // Already credited (e.g. a duplicate webhook/retry) — don't grant twice.
      return NextResponse.json({ verified: true, access: summarizeAccess(user) });
    }

    // Stack onto an existing active subscription rather than resetting it —
    // paying early doesn't cost you days you already have.
    const base =
      user.subscriptionExpires && new Date(user.subscriptionExpires) > new Date()
        ? new Date(user.subscriptionExpires)
        : new Date();
    const newExpiry = new Date(base.getTime() + THIRTY_DAYS_MS);

    const [, updatedUser] = await prisma.$transaction([
      prisma.order.update({ where: { id: order.id }, data: { status: "paid" } }),
      prisma.user.update({ where: { id: user.id }, data: { subscriptionExpires: newExpiry } }),
    ]);

    return NextResponse.json({ verified: true, access: summarizeAccess(updatedUser) });
  } catch (err) {
    console.error("Payment verification failed:", err);
    return NextResponse.json(
      { error: "Payment succeeded but we couldn't confirm it just now. Contact support with your payment ID." },
      { status: 500 }
    );
  }
}
