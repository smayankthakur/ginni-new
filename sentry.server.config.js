// Sentry, server runtime. Only initializes if SENTRY_DSN is set — leaving
// it unset (the default, matching every other optional key in this app)
// means Sentry is simply never loaded, at zero cost and zero risk.
// See README's "Error tracking" section for the one-time setup steps.
import * as Sentry from "@sentry/nextjs";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1, // light sampling — this app doesn't need full tracing, just error visibility
    // A handful of catch blocks that have been the actual source of every
    // debugging round so far (lib/auth.js, the pick/reveal/chat routes)
    // also call Sentry.captureException() explicitly — that's what makes
    // this reliable even under Turbopack's current route-handler
    // limitations, rather than depending only on automatic instrumentation.
  });
}
