import { prisma } from "@/lib/db";
import { withRetry } from "@/lib/withRetry";

// No 0/O/1/I — an 8-character code meant to be typed or read aloud without
// ambiguity. ~32^8 possibilities, so a collision on a random retry is
// astronomically unlikely; the retry loop in generateUniqueReferralCode()
// below exists purely as a correctness backstop, not because it's expected
// to ever actually fire.
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length = 8) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

// Called once, at signup, before the new User row is created — see
// app/api/auth/signup/route.js. Retries on the rare chance of a collision
// with an existing code rather than assuming uniqueness outright.
export async function generateUniqueReferralCode() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const existing = await withRetry(() => prisma.user.findUnique({ where: { referralCode: code }, select: { id: true } }));
    if (!existing) return code;
  }
  // Vanishingly unlikely to ever reach this — fall back to a longer code.
  return randomCode(12);
}
