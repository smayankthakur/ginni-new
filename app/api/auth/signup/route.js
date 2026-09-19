import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, setSessionCookie, summarizeAccess } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Server isn't configured yet (missing DATABASE_URL). Contact the site owner." },
      { status: 500 }
    );
  }
  if (!process.env.SESSION_SECRET) {
    return NextResponse.json(
      { error: "Server isn't configured yet (missing SESSION_SECRET). Contact the site owner." },
      { status: 500 }
    );
  }

  const { email, password, name } = await req.json().catch(() => ({}));

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email: normalizedEmail, passwordHash, name: name?.trim() || null },
    });

    await setSessionCookie(user.id);

    return NextResponse.json(summarizeAccess(user));
  } catch (err) {
    console.error("Signup failed:", err);
    return NextResponse.json(
      { error: "Couldn't create your account right now. Please try again in a moment." },
      { status: 500 }
    );
  }
}
