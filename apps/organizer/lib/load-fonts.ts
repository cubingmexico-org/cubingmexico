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
/**
 * Look-alikes for badge system fonts on machines that lack them (Linux,
 * Android). The last entry of each list is a generic CSS family.
 */
const SYSTEM_FONT_FALLBACKS: Record<string, string[]> = {
  Arial: ["Helvetica", "Liberation Sans", "Arimo", "sans-serif"],
  Helvetica: ["Arial", "Liberation Sans", "sans-serif"],
  "Times New Roman": ["Times", "Liberation Serif", "serif"],
  Georgia: ["serif"],
  "Courier New": ["Courier", "Liberation Mono", "monospace"],
  Verdana: ["DejaVu Sans", "sans-serif"],
  "Comic Sans MS": ["Comic Neue", "cursive"],
  Impact: ["Haettenschweiler", "Anton", "sans-serif"],
};
let registered = false;

/** Canvas `ctx.font` value; names must be quoted or families like "Source Sans 3" are rejected. */
export function canvasFont(
  weight: string,
  size: number,
  family: string,
): string {
  if (GENERIC_FAMILIES.has(family)) {
    return `${weight} ${size}px ${family}`;
  }
  const stack = [family, ...(SYSTEM_FONT_FALLBACKS[family] ?? ["sans-serif"])];
  const families = stack
    .map((name) => (GENERIC_FAMILIES.has(name) ? name : `"${name}"`))
    .join(", ");
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
      { weight: "400", url: f.webRegular },
      { weight: "700", url: f.webBold ?? f.webRegular },
    ];
    for (const { weight, url } of faces) {
      document.fonts.add(
        new FontFace(f.family, `url("${encodeURI(url)}") format("woff2")`, {
          weight,
          display: "swap",
        }),
      );
    }
  }
}

/**
 * Waits until a bundled family (or a bundled fallback of a system font) is
 * ready to draw on a canvas; other fonts resolve immediately.
 */
export async function ensureFontLoaded(
  family: string,
  weight: string = "normal",
): Promise<void> {
  const toLoad = [family, ...(SYSTEM_FONT_FALLBACKS[family] ?? [])].filter(
    (name) => bundledFamilies.has(name),
  );
  if (toLoad.length === 0 || typeof document === "undefined") {
    return;
  }
  registerBundledFonts();
  try {
    await Promise.all(
      toLoad.map((name) => document.fonts.load(`${weight} 16px "${name}"`)),
    );
  } catch (error) {
    console.error(`Failed to load font ${family}:`, error);
  }
}
