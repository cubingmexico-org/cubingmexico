// Plain ESM with JSDoc types: next.config.mjs loads this file directly, without a TypeScript step.
import { URL } from "node:url";

/**
 * Sentry's CSP report endpoint for a DSN such as `https://<key>@o1.ingest.us.sentry.io/<project>`.
 *
 * @param {string | undefined} dsn
 * @param {string | undefined} [environment]
 * @returns {string | null}
 */
export function sentryCspReportUri(dsn, environment) {
  if (!dsn) return null;

  let url;
  try {
    url = new URL(dsn);
  } catch {
    return null;
  }

  const projectId = url.pathname.replace(/^\/+|\/+$/g, "");
  if (!url.username || !projectId) return null;

  const report = new URL(`/api/${projectId}/security/`, url.origin);
  report.searchParams.set("sentry_key", url.username);
  if (environment) {
    report.searchParams.set("sentry_environment", environment);
  }
  return report.toString();
}

// Vercel injects its toolbar (comments, flags) into preview deployments.
const VERCEL_TOOLBAR = "https://vercel.live";

/**
 * Response headers for every route. Violations go to Sentry when a DSN is set. With
 * `enforce` the CSP blocks them; without it the header is Report-Only.
 *
 * @param {{
 *   connectSrc?: string[];
 *   scriptSrc?: string[];
 *   dev?: boolean;
 *   enforce?: boolean;
 *   sentryDsn?: string;
 *   environment?: string;
 * }} [options]
 * @returns {{ key: string; value: string }[]}
 */
export function securityHeaders({
  connectSrc = [],
  scriptSrc = [],
  dev = false,
  enforce = false,
  sentryDsn,
  environment,
} = {}) {
  const reportUri = sentryCspReportUri(sentryDsn, environment);
  const preview = environment === "preview";

  /** @type {Record<string, string[]>} */
  const directives = {
    "default-src": ["'self'"],
    // Next.js inlines its bootstrap scripts; dev mode also needs eval for fast refresh.
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(dev ? ["'unsafe-eval'"] : []),
      ...(preview ? [VERCEL_TOOLBAR] : []),
      ...scriptSrc,
    ],
    "style-src": [
      "'self'",
      "'unsafe-inline'",
      ...(preview ? [VERCEL_TOOLBAR] : []),
    ],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": [
      "'self'",
      "data:",
      ...(preview ? [VERCEL_TOOLBAR, "https://assets.vercel.com"] : []),
    ],
    "connect-src": [
      "'self'",
      "blob:",
      "data:",
      ...(reportUri ? [new URL(reportUri).origin] : []),
      ...(dev ? ["ws:"] : []),
      ...(preview ? [VERCEL_TOOLBAR, "wss://ws-us3.pusher.com"] : []),
      ...connectSrc,
    ],
    "frame-src": ["'self'", ...(preview ? [VERCEL_TOOLBAR] : [])],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  if (reportUri) {
    directives["report-uri"] = [reportUri];
  }

  const csp = Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(" ")}`)
    .join("; ");

  return [
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains",
    },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()",
    },
    {
      key: enforce
        ? "Content-Security-Policy"
        : "Content-Security-Policy-Report-Only",
      value: csp,
    },
  ];
}
