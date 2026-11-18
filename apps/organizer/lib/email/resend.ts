import { Resend } from "resend";

export type SendCertificateEmailInput = {
  to: string;
  subject: string;
  html: string;
  filename: string;
  pdf: Buffer;
};

export type SendCertificateEmailResult =
  | { ok: true; id: string }
  | {
      ok: false;
      error: string;
      dailyQuotaHit?: boolean;
      monthlyQuotaHit?: boolean;
    };

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(apiKey);
}

export function getCertificateFromAddress(): string {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error("RESEND_FROM_EMAIL is not configured");
  }
  return from;
}

function quotaFlags(error: unknown): {
  dailyQuotaHit: boolean;
  monthlyQuotaHit: boolean;
  message: string;
} {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : error instanceof Error
        ? error.message
        : "Error al enviar el correo";

  const name =
    error && typeof error === "object" && "name" in error
      ? String((error as { name: unknown }).name)
      : "";

  const haystack = `${name} ${message}`.toLowerCase();
  return {
    dailyQuotaHit:
      haystack.includes("daily_quota_exceeded") ||
      haystack.includes("daily quota"),
    monthlyQuotaHit:
      haystack.includes("monthly_quota_exceeded") ||
      haystack.includes("monthly quota"),
    message,
  };
}

export async function sendCertificateEmail(
  input: SendCertificateEmailInput,
): Promise<SendCertificateEmailResult> {
  const resend = getResendClient();
  const from = getCertificateFromAddress();

  const { data, error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    attachments: [
      {
        filename: input.filename,
        content: input.pdf,
      },
    ],
  });

  if (error) {
    const flags = quotaFlags(error);
    return {
      ok: false,
      error: flags.message,
      dailyQuotaHit: flags.dailyQuotaHit,
      monthlyQuotaHit: flags.monthlyQuotaHit,
    };
  }

  if (!data?.id) {
    return { ok: false, error: "Resend no devolvió un id de correo" };
  }

  return { ok: true, id: data.id };
}
