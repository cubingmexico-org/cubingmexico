import { describe, expect, it } from "vitest";
import {
  MAILTO_URL_MAX_LENGTH,
  buildClaimMailto,
  claimMailtoBody,
} from "./mailto";

describe("buildClaimMailto", () => {
  const claimUrl = "https://certificados.example/claim/tok";

  it("includes BCC when the URL fits", () => {
    const result = buildClaimMailto({
      emails: ["a@example.com", "b@example.com"],
      competitionName: "Open 2026",
      claimUrl,
    });

    expect(result.copyEmailsToClipboard).toBe(false);
    expect(result.href).toContain("bcc=");
    expect(result.href).toContain(
      encodeURIComponent(claimUrl).replace(/%20/g, "+"),
    );
    expect(result.href).toContain("subject=");
  });

  it("omits BCC and asks to copy when the URL would be too long", () => {
    const emails = Array.from(
      { length: 80 },
      (_, i) => `competitor${i}@verylongdomain.example.com`,
    );
    const result = buildClaimMailto({
      emails,
      competitionName: "Campeonato Nacional Cubing México 2026",
      claimUrl,
    });

    expect(result.copyEmailsToClipboard).toBe(true);
    expect(result.href.startsWith("mailto:?subject=")).toBe(true);
    expect(result.href).not.toContain("bcc=");
    expect(result.href.length).toBeLessThanOrEqual(MAILTO_URL_MAX_LENGTH);
  });

  it("builds a body with the claim link", () => {
    expect(claimMailtoBody(claimUrl)).toContain(claimUrl);
    expect(claimMailtoBody(claimUrl)).toContain("WCA");
  });
});
