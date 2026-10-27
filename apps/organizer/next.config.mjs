import process from "node:process";
import { withSentryConfig } from "@sentry/nextjs/config";

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  images: {
    unoptimized: true,
  },
  experimental: {
    authInterrupts: true,
  },
  async headers() {
    return [
      {
        // File names are not versioned, so cache for a week instead of `immutable`.
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

// Source maps upload only when SENTRY_AUTH_TOKEN (plus SENTRY_ORG and SENTRY_PROJECT) is set.
export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  telemetry: false,
  widenClientFileUpload: true,
});
