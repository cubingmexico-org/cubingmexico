/** Prefer icon for small marks; fall back to full logo when icon is missing. */
export function brandMarkSrc(
  icon: string | null | undefined,
  image: string | null | undefined,
): string | null {
  return icon || image || null;
}
