// Next.js calls register() once, on server startup, before any route
// handler runs — this is the standard @sentry/nextjs App Router hookup.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config.js");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config.js");
  }
}

// Reports errors from nested React Server Components — the current
// recommended hook alongside register() above.
export async function onRequestError(...args) {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
}
