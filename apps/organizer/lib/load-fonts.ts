import { BUNDLED_FONTS } from "@/lib/fonts";

const bundledFamilies = new Set(BUNDLED_FONTS.map((f) => f.family));
const GENERIC_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
]);
let registered = false;

/** Canvas `ctx.font` value; names must be quoted or families like "Source Sans 3" are rejected. */
export function canvasFont(
  weight: string,
  size: number,
  family: string,
): string {
  const families = GENERIC_FAMILIES.has(family)
    ? family
    : `"${family}", sans-serif`;
  return `${weight} ${size}px ${families}`;
}

/**
 * Registers every bundled font with the browser. Files are only downloaded
 * once a family is actually used. Single-weight fonts register their regular
 * file as bold too, so bold text looks the same as in the PDFs (no faux bold).
 */
export function registerBundledFonts(): void {
  if (registered || typeof document === "undefined") {
    return;
  }
  registered = true;

  for (const f of BUNDLED_FONTS) {
    const faces = [
      { weight: "400", url: f.regular },
      { weight: "700", url: f.bold ?? f.regular },
    ];
    for (const { weight, url } of faces) {
      document.fonts.add(
        new FontFace(f.family, `url("${encodeURI(url)}")`, {
          weight,
          display: "swap",
        }),
      );
    }
  }
}

/** Waits until a bundled family is ready to draw on a canvas; system fonts resolve immediately. */
export async function ensureFontLoaded(
  family: string,
  weight: string = "normal",
): Promise<void> {
  if (!bundledFamilies.has(family) || typeof document === "undefined") {
    return;
  }
  registerBundledFonts();
  try {
    await document.fonts.load(`${weight} 16px "${family}"`);
  } catch (error) {
    console.error(`Failed to load font ${family}:`, error);
  }
}
