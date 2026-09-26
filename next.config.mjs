import { withSentryConfig } from "@sentry/nextjs/config";

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
};

// withSentryConfig is a no-op wrapper when SENTRY_DSN isn't set (nothing
// about the build changes), so this is safe to leave in place even for a
// deployment that never configures Sentry at all — see the "Error
// tracking" section in README.md.
export default withSentryConfig(nextConfig, {
  silent: true, // don't print Sentry's build-time logs unless something's actually wrong
  // Source-map upload needs an auth token + org/project — only relevant if
  // you want readable stack traces in the Sentry dashboard. Skipped here
  // (SENTRY_AUTH_TOKEN unset) rather than requiring yet another key up
  // front; add it later if minified stack traces become annoying to read.
});
