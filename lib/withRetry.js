// Supabase's pooled ("Transaction mode") connection can throw a transient
// Postgres error — "prepared statement \"sN\" does not exist", code 26000 —
// even with `?pgbouncer=true` on DATABASE_URL. It's a known PgBouncer/Prisma
// interaction (the pooler occasionally hands a serverless function a
// connection that still has another invocation's prepared statement on
// it), not a real data problem, and it clears itself on the very next
// attempt against a different pooled connection.
//
// Every route that touches the database wraps its Prisma call in
// withRetry() so this one specific, well-understood error is retried
// automatically instead of surfacing as "please log in" or a failed
// reading. Anything else — a real validation error, a genuinely wrong
// password, a truly unreachable database — is NOT retried and still fails
// immediately, exactly as before.
function isTransientPgBouncerError(err) {
  const msg = String(err?.message || err || "");
  return msg.includes("prepared statement") || msg.includes("26000");
}

export async function withRetry(fn, { retries = 2, delayMs = 120 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransientPgBouncerError(err) || attempt === retries) throw err;
      console.warn(`withRetry: transient PgBouncer error, retrying (attempt ${attempt + 1}/${retries})`);
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }
  throw lastErr;
}
