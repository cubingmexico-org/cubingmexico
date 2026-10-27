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

/**
 * Response headers for every route. The CSP is Report-Only: violations go to Sentry
 * (when a DSN is set) so the policy can be tightened and enforced once they're clean.
 *
 * @param {{
 *   connectSrc?: string[];
 *   dev?: boolean;
 *   sentryDsn?: string;
 *   environment?: string;
 * }} [options]
 * @returns {{ key: string; value: string }[]}
 */
export function securityHeaders({
  connectSrc = [],
  dev = false,
  sentryDsn,
  environment,
} = {}) {
  const reportUri = sentryCspReportUri(sentryDsn, environment);

  /** @type {Record<string, string[]>} */
  const directives = {
    "default-src": ["'self'"],
    // Next.js inlines its bootstrap scripts; dev mode also needs eval for fast refresh.
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(dev ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      "blob:",
      "data:",
      ...(reportUri ? [new URL(reportUri).origin] : []),
      ...(dev ? ["ws:"] : []),
      ...connectSrc,
    ],
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
    { key: "Content-Security-Policy-Report-Only", value: csp },
  ];
}
