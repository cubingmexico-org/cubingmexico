/**
 * Extract the first Markdown image URL from competition information text.
 * Handles filenames that contain parentheses (e.g. `logo-08 (1).png`).
 */
export function extractFirstImageUrl(
  information: string | null | undefined,
): string | null {
  if (!information) {
    return null;
  }

  const marker = "![";
  let searchFrom = 0;

  while (searchFrom < information.length) {
    const bangIndex = information.indexOf(marker, searchFrom);
    if (bangIndex === -1) {
      return null;
    }

    const afterAltStart = bangIndex + marker.length;
    const altEnd = information.indexOf("](", afterAltStart);
    if (altEnd === -1) {
      return null;
    }

    const urlStart = altEnd + 2;
    const urlEnd = findMarkdownLinkUrlEnd(information, urlStart);
    if (urlEnd === -1) {
      searchFrom = urlStart;
      continue;
    }

    const url = information.slice(urlStart, urlEnd).trim();
    if (url.length > 0) {
      return url;
    }

    searchFrom = urlEnd + 1;
  }

  return null;
}

export function informationHasExtractableLogo(
  information: string | null | undefined,
): boolean {
  return extractFirstImageUrl(information) !== null;
}

/**
 * Find the closing `)` of a Markdown link destination, allowing nested
 * parentheses inside the URL (common in WCA Active Storage filenames).
 */
function findMarkdownLinkUrlEnd(text: string, urlStart: number): number {
  let depth = 0;

  for (let i = urlStart; i < text.length; i++) {
    const ch = text[i];
    if (ch === "(") {
      depth += 1;
      continue;
    }
    if (ch === ")") {
      if (depth === 0) {
        return i;
      }
      depth -= 1;
      continue;
    }
    // End of line / new paragraph without a closer — give up on this match
    if (ch === "\n") {
      return -1;
    }
  }

  return -1;
}
