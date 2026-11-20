import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();

vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

describe("sendCertificateEmail", () => {
  beforeEach(() => {
    send.mockReset();
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("RESEND_FROM_EMAIL", "from@example.com");
  });

  it("sends a PDF attachment", async () => {
    send.mockResolvedValue({ data: { id: "msg_1" }, error: null });
    const { sendCertificateEmail } = await import("./resend");

    await expect(
      sendCertificateEmail({
        to: "competitor@example.com",
        subject: "Certificado",
        html: "<p>hola</p>",
        filename: "cert.pdf",
        pdf: Buffer.from("%PDF"),
      }),
    ).resolves.toEqual({ ok: true, id: "msg_1" });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "from@example.com",
        to: "competitor@example.com",
        attachments: [expect.objectContaining({ filename: "cert.pdf" })],
      }),
    );
  });

  it("maps daily quota errors", async () => {
    send.mockResolvedValue({
      data: null,
      error: { name: "rate_limit_exceeded", message: "daily_quota_exceeded" },
    });
    const { sendCertificateEmail } = await import("./resend");

    await expect(
      sendCertificateEmail({
        to: "competitor@example.com",
        subject: "Certificado",
        html: "<p>hola</p>",
        filename: "cert.pdf",
        pdf: Buffer.from("%PDF"),
      }),
    ).resolves.toEqual({
      ok: false,
      error: "daily_quota_exceeded",
      dailyQuotaHit: true,
      monthlyQuotaHit: false,
    });
  });
});
