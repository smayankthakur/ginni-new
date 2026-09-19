import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Backs SiteFooter's "Get Daily Divine Insights" form.
export async function POST(req) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { message: "Server isn't configured yet (missing DATABASE_URL). Contact the site owner." },
      { status: 500 }
    );
  }

  const { email, phone, source } = await req.json().catch(() => ({}));

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ message: "Enter a valid email address." }, { status: 400 });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedPhone = phone ? String(phone).trim() : null;

  try {
    // Upsert so re-subscribing (or updating a WhatsApp number later) never 409s.
    await prisma.newsletterSubscriber.upsert({
      where: { email: normalizedEmail },
      update: { phone: normalizedPhone ?? undefined },
      create: {
        email: normalizedEmail,
        phone: normalizedPhone,
        source: source || "footer",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Newsletter subscribe failed:", err);
    return NextResponse.json(
      { message: "Couldn't subscribe right now. Please try again in a moment." },
      { status: 500 }
    );
  }
}
