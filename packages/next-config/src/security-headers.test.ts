import { describe, expect, it } from "vitest";
import { securityHeaders, sentryCspReportUri } from "./security-headers.mjs";

function header(headers: { key: string; value: string }[], key: string) {
  return headers.find((h) => h.key === key)?.value;
}

describe("sentryCspReportUri", () => {
  it("builds Sentry's security endpoint from a DSN", () => {
    expect(
      sentryCspReportUri(
        "https://abc123@o42.ingest.us.sentry.io/7",
        "production",
      ),
    ).toBe(
      "https://o42.ingest.us.sentry.io/api/7/security/?sentry_key=abc123&sentry_environment=production",
    );
  });

  it("returns null without a usable DSN", () => {
    expect(sentryCspReportUri(undefined)).toBeNull();
    expect(sentryCspReportUri("not a url")).toBeNull();
    expect(sentryCspReportUri("https://o42.ingest.sentry.io/7")).toBeNull();
  });
});

describe("securityHeaders", () => {
  it("only reports CSP violations instead of blocking them", () => {
    const headers = securityHeaders();
    expect(header(headers, "Content-Security-Policy")).toBeUndefined();
    expect(header(headers, "Content-Security-Policy-Report-Only")).toContain(
      "frame-ancestors 'none'",
    );
    expect(header(headers, "X-Frame-Options")).toBe("DENY");
  });

  it("allows the app's extra origins and reports to Sentry", () => {
    const csp = header(
      securityHeaders({
        connectSrc: ["https://*.ufs.sh"],
        sentryDsn: "https://abc123@o42.ingest.us.sentry.io/7",
      }),
      "Content-Security-Policy-Report-Only",
    );
    expect(csp).toMatch(
      /connect-src 'self' blob: data: https:\/\/o42\.ingest\.us\.sentry\.io https:\/\/\*\.ufs\.sh;/,
    );
    expect(csp).toContain(
      "report-uri https://o42.ingest.us.sentry.io/api/7/security/?sentry_key=abc123",
    );
  });

  it("blocks violations when enforced, still reporting them", () => {
    const headers = securityHeaders({
      enforce: true,
      sentryDsn: "https://abc123@o42.ingest.us.sentry.io/7",
    });
    expect(header(headers, "Content-Security-Policy-Report-Only")).toBe(
      undefined,
    );
    const csp = header(headers, "Content-Security-Policy");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("report-uri https://o42.ingest.us.sentry.io/");
  });

  it("appends the app's extra script sources", () => {
    const csp = header(
      securityHeaders({ scriptSrc: ["'wasm-unsafe-eval'"] }),
      "Content-Security-Policy-Report-Only",
    );
    expect(csp).toMatch(
      /script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval';/,
    );
  });

  it("allows the Vercel toolbar only on preview deployments", () => {
    const preview = header(
      securityHeaders({ environment: "preview" }),
      "Content-Security-Policy-Report-Only",
    );
    const production = header(
      securityHeaders({ environment: "production" }),
      "Content-Security-Policy-Report-Only",
    );
    expect(preview).toMatch(/script-src [^;]*https:\/\/vercel\.live/);
    expect(preview).toMatch(/frame-src 'self' https:\/\/vercel\.live;/);
    expect(production).not.toContain("vercel.live");
    expect(production).toContain("frame-src 'self';");
  });

  it("allows eval and the HMR socket only in development", () => {
    const prod = header(
      securityHeaders(),
      "Content-Security-Policy-Report-Only",
    );
    const dev = header(
      securityHeaders({ dev: true }),
      "Content-Security-Policy-Report-Only",
    );
    expect(prod).not.toContain("'unsafe-eval'");
    expect(prod).not.toContain("ws:");
    expect(dev).toContain("'unsafe-eval'");
    expect(dev).toContain("ws:");
  });
});
