// Sentry, edge runtime (middleware, edge API routes — this app doesn't
// currently use either, but Next.js expects this file to exist alongside
// sentry.server.config.js). Same SENTRY_DSN gate as the server config.
import * as Sentry from "@sentry/nextjs";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}
