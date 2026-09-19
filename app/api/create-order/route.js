import Razorpay from "razorpay";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Requires RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET set as environment
// variables (server-side only — never expose the key secret to the client).
export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return NextResponse.json(
      { error: "Payments aren't configured yet. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." },
      { status: 500 }
    );
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  try {
    const amount = 199 * 100; // paise
    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `gkb_${Date.now()}`,
      notes: { product: "Ginni Ki Baatein — 30 day unlock", userId: user.id },
    });

    // Recorded so /api/verify-payment can confirm this order belongs to
    // this user and hasn't already been credited, before it trusts anything
    // the client sends back.
    await prisma.order.create({
      data: {
        userId: user.id,
        razorpayOrderId: order.id,
        amount,
        status: "created",
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Razorpay order creation failed:", err);
    return NextResponse.json({ error: "Could not create order." }, { status: 500 });
  }
}
