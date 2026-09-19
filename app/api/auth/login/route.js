import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, setSessionCookie, summarizeAccess } from "@/lib/auth";

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

  const { email, password } = await req.json().catch(() => ({}));

  if (!email || !password) {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    }

    await setSessionCookie(user.id);

    return NextResponse.json(summarizeAccess(user));
  } catch (err) {
    console.error("Login failed:", err);
    return NextResponse.json(
      { error: "Couldn't log you in right now. Please try again in a moment." },
      { status: 500 }
    );
  }
}
