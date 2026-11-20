/** Soft limit for mailto URLs across common mail clients / OS handlers. */
export const MAILTO_URL_MAX_LENGTH = 1800;

export type BuildClaimMailtoInput = {
  emails: string[];
  competitionName: string;
  claimUrl: string;
};

export type BuildClaimMailtoResult = {
  href: string;
  /** When true, BCC was omitted because the URL would be too long. */
  copyEmailsToClipboard: boolean;
};

function encodeMailtoParam(value: string): string {
  return encodeURIComponent(value).replace(/%20/g, "+");
}

export function claimMailtoSubject(competitionName: string): string {
  return `Certificado de participación — ${competitionName}`;
}

export function claimMailtoBody(claimUrl: string): string {
  return [
    "Hola,",
    "",
    "Ya puedes descargar tu certificado de participación.",
    "Abre el siguiente enlace e inicia sesión con tu cuenta de la WCA:",
    "",
    claimUrl,
    "",
    "Solo podrás descargar tu propio certificado.",
    "",
    "— Cubing México",
  ].join("\n");
}

/** Build a single mailto for all selected competitors with the shared claim link. */
export function buildClaimMailto(
  input: BuildClaimMailtoInput,
): BuildClaimMailtoResult {
  const subject = encodeMailtoParam(claimMailtoSubject(input.competitionName));
  const body = encodeMailtoParam(claimMailtoBody(input.claimUrl));
  const base = `mailto:?subject=${subject}&body=${body}`;

  if (input.emails.length === 0) {
    return { href: base, copyEmailsToClipboard: false };
  }

  const bcc = encodeMailtoParam(input.emails.join(","));
  const withBcc = `mailto:?bcc=${bcc}&subject=${subject}&body=${body}`;

  if (withBcc.length <= MAILTO_URL_MAX_LENGTH) {
    return { href: withBcc, copyEmailsToClipboard: false };
  }

  return { href: base, copyEmailsToClipboard: true };
}
