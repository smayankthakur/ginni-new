// Sentry, browser runtime — catches errors in the chat UI itself (a
// render crash, a fetch that throws) that the server-side config above
// never sees. Sentry DSNs are safe to expose client-side by design (unlike
// every other key in this app), hence NEXT_PUBLIC_ here specifically.
// Optional — unset by default, same as everything else Sentry-related.
import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
