import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withRetry } from "@/lib/withRetry";
import { isEmailConfigured, sendEmail, passwordResetEmail } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_TTL_MINUTES = 30;
// At most this many reset emails per account per hour — stops someone
// hammering a victim's inbox (and our Resend quota) via the public form.
const MAX_PER_HOUR = 3;

// POST { email } -> always 200 with the same message whether or not the
// address has an account, so the form can't be used to discover which
// emails are registered. The only non-200 is when email sending isn't set
// up at all, which the person needs to know about rather than wait for a
// mail that will never come.
export async function POST(req) {
  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Password reset emails aren't set up on this site yet. Please contact support to reset your password." },
      { status: 503 }
    );
  }

  const { email } = await req.json().catch(() => ({}));
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  const normalizedEmail = email.trim().toLowerCase();
  const generic = {
    ok: true,
    message: "If an account exists for that email, a reset link is on its way. Check your inbox (and spam folder).",
  };

  try {
    const user = await withRetry(() => prisma.user.findUnique({ where: { email: normalizedEmail } }));
    if (!user) return NextResponse.json(generic);

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await withRetry(() =>
      prisma.passwordResetToken.count({ where: { userId: user.id, createdAt: { gt: oneHourAgo } } })
    );
    if (recent >= MAX_PER_HOUR) return NextResponse.json(generic);

    const rawToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);
    await withRetry(() => prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } }));

    // Link points back at this deployment (works for the vercel.app URL and
    // any custom domain); APP_URL overrides it if ever needed.
    const origin = process.env.APP_URL || new URL(req.url).origin;
    const link = `${origin}/reset-password?token=${rawToken}`;
    const mail = passwordResetEmail({ name: user.name, link, minutes: RESET_TTL_MINUTES });
    await sendEmail({ to: user.email, ...mail });

    return NextResponse.json(generic);
  } catch (err) {
    console.error("forgot-password failed:", err);
    Sentry.captureException(err, { tags: { area: "forgot-password" } });
    return NextResponse.json(
      { error: "Couldn't send the reset email right now. Please try again in a moment." },
      { status: 500 }
    );
  }
}
