import process from "node:process";
import { withSentryConfig } from "@sentry/nextjs/config";
import { securityHeaders } from "@workspace/next-config/security-headers";

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
        source: "/:path*",
        headers: securityHeaders({
          dev: process.env.NODE_ENV === "development",
          sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
          environment: process.env.NEXT_PUBLIC_VERCEL_ENV,
        }),
      },
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
