export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency,
  }).format(amount / 100);
}

export function extractEmail(
  contact: string | null | undefined,
): string | null {
  if (!contact) return null;
  // Match [text](mailto:email) or just email
  const markdownMailto = contact.match(/\[.*?\]\(mailto:(.*?)\)/);
  if (markdownMailto) return markdownMailto[1] ?? null;
  // Match plain email
  const plainEmail = contact.match(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  );
  return plainEmail ? plainEmail[0] : null;
}
