import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withRetry } from "@/lib/withRetry";
import { hashPassword, setSessionCookie, summarizeAccess } from "@/lib/auth";

const INVALID = "This reset link is invalid or has expired. Please request a new one.";

function hashToken(raw) {
  return crypto.createHash("sha256").update(String(raw)).digest("hex");
}

async function findLiveToken(raw) {
  if (!raw || typeof raw !== "string" || raw.length < 20) return null;
  const row = await withRetry(() =>
    prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(raw) }, include: { user: true } })
  );
  if (!row || row.usedAt || row.expiresAt < new Date()) return null;
  return row;
}

// GET ?token=... -> { valid } so the reset page can say "link expired"
// up front instead of after someone has typed a new password twice.
export async function GET(req) {
  const token = new URL(req.url).searchParams.get("token");
  try {
    const row = await findLiveToken(token);
    return NextResponse.json({ valid: !!row });
  } catch (err) {
    console.error("reset-password check failed:", err);
    Sentry.captureException(err, { tags: { area: "reset-password-check" } });
    return NextResponse.json({ valid: false });
  }
}

// POST { token, password } -> sets the new password, burns the token (and
// every other outstanding one for that account), and logs the person in
// so they land straight back in their readings.
export async function POST(req) {
  const { token, password } = await req.json().catch(() => ({}));
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  try {
    const row = await findLiveToken(token);
    if (!row) return NextResponse.json({ error: INVALID }, { status: 400 });

    const passwordHash = await hashPassword(password);
    const now = new Date();
    const [user] = await withRetry(() =>
      prisma.$transaction([
        prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
        prisma.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: now } }),
        prisma.passwordResetToken.updateMany({
          where: { userId: row.userId, usedAt: null, id: { not: row.id } },
          data: { usedAt: now },
        }),
      ])
    );

    await setSessionCookie(user.id);
    return NextResponse.json({ ok: true, access: summarizeAccess(user) });
  } catch (err) {
    console.error("reset-password failed:", err);
    Sentry.captureException(err, { tags: { area: "reset-password" } });
    return NextResponse.json(
      { error: "Couldn't reset your password right now. Please try again in a moment." },
      { status: 500 }
    );
  }
}
