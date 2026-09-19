import { NextResponse } from "next/server";

// TEMPORARY — delete this file once the database connection issue is
// resolved. It never returns a password, only host/port, but there's no
// reason to leave a config-introspection endpoint live long-term.
function redactedInfo(name) {
  const raw = process.env[name];
  if (!raw) return { set: false };
  try {
    const u = new URL(raw);
    return {
      set: true,
      host: u.hostname,
      port: u.port || "(default)",
      username: u.username,
      pathname: u.pathname,
      // deliberately omitting u.password
      hasPgbouncerParam: u.searchParams.get("pgbouncer"),
    };
  } catch {
    return { set: true, parseError: "Value is set but isn't a valid URL — check for stray quotes/spaces." };
  }
}

export async function GET() {
  return NextResponse.json({
    DATABASE_URL: redactedInfo("DATABASE_URL"),
    DIRECT_URL: redactedInfo("DIRECT_URL"),
    SESSION_SECRET_set: !!process.env.SESSION_SECRET,
    RAZORPAY_KEY_ID_set: !!process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET_set: !!process.env.RAZORPAY_KEY_SECRET,
    VERCEL_ENV: process.env.VERCEL_ENV || null,
  });
}
