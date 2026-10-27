import process from "node:process";
import { withSentryConfig } from "@sentry/nextjs/config";
import { securityHeaders } from "@workspace/next-config/security-headers";

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui", "@workspace/db"],
  cacheComponents: true,
  // Off for Vercel free-tier prefetch costs; see docs/web-hosting-constraints.md.
  partialPrefetching: false,
  serverExternalPackages: ["@imgly/background-removal", "onnxruntime-web"],

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders({
          dev: process.env.NODE_ENV === "development",
          enforce: true,
          sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
          environment: process.env.NEXT_PUBLIC_VERCEL_ENV,
          // The background-removal model for competition logos runs on WebAssembly.
          scriptSrc: ["'wasm-unsafe-eval'"],
          // UploadThing uploads, and the background-removal model for competition logos.
          connectSrc: [
            "https://*.uploadthing.com",
            "https://*.ufs.sh",
            "https://utfs.io",
            "https://staticimgly.com",
          ],
        }),
      },
    ];
  },

  async redirects() {
    return [
      {
        source: "/records/:state([A-Za-z]{2,3})",
        destination: "/records?state=:state",
        permanent: true,
      },
      {
        source:
          "/rankings/a/:eventId/:rankType(single|average)/:state([A-Za-z]{2,3})",
        destination: "/rankings/:eventId/:rankType",
        permanent: true,
      },
      {
        source: "/rankings/a/:eventId/:rankType(single|average)",
        destination: "/rankings/:eventId/:rankType",
        permanent: true,
      },
      {
        source:
          "/rankings/:gender(f|m)/:eventId/:rankType(single|average)/:state([A-Za-z]{2,3})",
        destination: "/rankings/:eventId/:rankType?gender=:gender",
        permanent: true,
      },
      {
        source: "/rankings/:gender(f|m)/:eventId/:rankType(single|average)",
        destination: "/rankings/:eventId/:rankType?gender=:gender",
        permanent: true,
      },
      {
        source: "/rankings/333mbf/average",
        destination: "/rankings/333mbf/single",
        permanent: true,
      },
      {
        source: "/rankings/333mbf/average/results",
        destination: "/rankings/333mbf/single/results",
        permanent: true,
      },
      {
        source: "/team/:id",
        destination: "/teams/:id",
        permanent: true,
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.worldcubeassociation.org",
        port: "",
        pathname: "/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "assets.worldcubeassociation.org",
        port: "",
        pathname: "/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        port: "",
        pathname: "/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "gf7z9ppeqt.ufs.sh",
        port: "",
        pathname: "/**",
        search: "",
      },
    ],
    unoptimized: true,
  },
  experimental: {
    authInterrupts: true,
  },
};

// Source maps upload only when SENTRY_AUTH_TOKEN (plus SENTRY_ORG and SENTRY_PROJECT) is set.
export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  telemetry: false,
  widenClientFileUpload: true,
});
