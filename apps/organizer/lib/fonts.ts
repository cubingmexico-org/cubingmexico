export type FontCategory = "sans" | "serif" | "display" | "script" | "mono";

export const FONT_CATEGORIES: { id: FontCategory; label: string }[] = [
  { id: "sans", label: "Sans serif" },
  { id: "serif", label: "Serif" },
  { id: "display", label: "Display" },
  { id: "script", label: "Manuscrita" },
  { id: "mono", label: "Monoespaciada" },
];

/** A font whose files live in `public/fonts`, usable in the editors, canvas and PDFs. */
export interface BundledFont {
  family: string;
  category: FontCategory;
  /** Path under the app origin, e.g. `/fonts/Roboto/Roboto-Regular.ttf`. */
  regular: string;
  /** Omitted for single-weight fonts; bold then falls back to `regular`. */
  bold?: string;
}

const font = (
  family: string,
  category: FontCategory,
  dir: string,
  prefix: string,
  { bold = true, ext = "ttf" }: { bold?: boolean; ext?: "ttf" | "otf" } = {},
): BundledFont => ({
  family,
  category,
  regular: `/fonts/${dir}/${prefix}-Regular.${ext}`,
  ...(bold ? { bold: `/fonts/${dir}/${prefix}-Bold.${ext}` } : {}),
});

export const BUNDLED_FONTS: BundledFont[] = [
  // Sans serif
  font("Archivo", "sans", "Archivo", "Archivo"),
  font("Barlow", "sans", "Barlow", "Barlow"),
  font(
    "Basically A Sans Serif Font",
    "sans",
    "BasicallyASansSerif",
    "BasicallyASansSerif",
    { bold: false },
  ),
  font("DM Sans", "sans", "DM_Sans", "DMSans"),
  font("Fira Sans", "sans", "Fira_Sans", "FiraSans"),
  font("Inter", "sans", "Inter", "Inter"),
  font("Josefin Sans", "sans", "Josefin_Sans", "JosefinSans"),
  font("Kanit", "sans", "Kanit", "Kanit"),
  font("Lato", "sans", "Lato", "Lato"),
  font("Manrope", "sans", "Manrope", "Manrope"),
  font("Maven Pro", "sans", "MavenPro", "MavenPro"),
  font("Montserrat", "sans", "Montserrat", "Montserrat"),
  font("Mulish", "sans", "Mulish", "Mulish"),
  font("Noto Sans", "sans", "Noto_Sans", "NotoSans"),
  font("Nunito", "sans", "Nunito", "Nunito"),
  font("Open Sans", "sans", "Open_Sans", "OpenSans"),
  font("Poppins", "sans", "Poppins", "Poppins"),
  font("PT Sans", "sans", "PT_Sans", "PTSans"),
  font("Raleway", "sans", "Raleway", "Raleway"),
  font("Roboto", "sans", "Roboto", "Roboto"),
  font("Roboto Condensed", "sans", "Roboto_Condensed", "RobotoCondensed"),
  font("Rubik", "sans", "Rubik", "Rubik"),
  font("Source Sans 3", "sans", "Source_Sans_3", "SourceSans3"),
  font("Ubuntu", "sans", "Ubuntu", "Ubuntu"),
  font("Work Sans", "sans", "Work_Sans", "WorkSans"),
  // Serif
  font("Cinzel", "serif", "Cinzel", "Cinzel"),
  font(
    "Cormorant Garamond",
    "serif",
    "Cormorant_Garamond",
    "CormorantGaramond",
  ),
  font("Crimson Text", "serif", "Crimson_Text", "CrimsonText"),
  font("EB Garamond", "serif", "EB_Garamond", "EBGaramond"),
  font("Libre Baskerville", "serif", "Libre_Baskerville", "LibreBaskerville"),
  font("Lora", "serif", "Lora", "Lora"),
  font("Merriweather", "serif", "Merriweather", "Merriweather"),
  font("Playfair Display", "serif", "Playfair_Display", "PlayfairDisplay"),
  font("Roboto Slab", "serif", "Roboto_Slab", "RobotoSlab"),
  // Display
  font("Anton", "display", "Anton", "Anton", { bold: false }),
  font("Bebas Neue", "display", "Bebas_Neue", "BebasNeue", { bold: false }),
  font("Black Ops One", "display", "Black_Ops_One", "BlackOpsOne", {
    bold: false,
  }),
  font("Bungee", "display", "Bungee", "Bungee", { bold: false }),
  font("Chau Philomene", "display", "Chau_Philomene", "ChauPhilomeneOne", {
    bold: false,
  }),
  font("Lobster", "display", "Lobster", "Lobster", { bold: false }),
  font("Oswald", "display", "Oswald", "Oswald"),
  font("Righteous", "display", "Righteous", "Righteous", { bold: false }),
  font("Russo One", "display", "Russo_One", "RussoOne", { bold: false }),
  font("Santa Monday", "display", "SantaMonday", "SantaMonday", {
    bold: false,
    ext: "otf",
  }),
  // Script
  font("Allura", "script", "Allura", "Allura", { bold: false }),
  font("Caveat", "script", "Caveat", "Caveat"),
  font("Cookie", "script", "Cookie", "Cookie", { bold: false }),
  font("Dancing Script", "script", "Dancing_Script", "DancingScript"),
  font("Great Vibes", "script", "Great_Vibes", "GreatVibes", { bold: false }),
  font("Kaushan Script", "script", "Kaushan_Script", "KaushanScript", {
    bold: false,
  }),
  font("Pacifico", "script", "Pacifico", "Pacifico", { bold: false }),
  font("Parisienne", "script", "Parisienne", "Parisienne", { bold: false }),
  font("Sacramento", "script", "Sacramento", "Sacramento", { bold: false }),
  font("Satisfy", "script", "Satisfy", "Satisfy", { bold: false }),
  // Monospace
  font("Roboto Mono", "mono", "Roboto_Mono", "RobotoMono"),
];

/** Badge-only: drawn by the browser on canvas, but their files can't be bundled for PDFs. */
export const BADGE_SYSTEM_FONTS = [
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Georgia",
  "Courier New",
  "Verdana",
  "Comic Sans MS",
  "Impact",
];

export const fontFamilies = BUNDLED_FONTS.map((f) => f.family);

export const fonts = BUNDLED_FONTS.map((f) => ({
  value: f.family,
  label: f.family,
}));

/** pdfmake font dictionary; italics are not bundled, so they reuse the upright files. */
export const fontDeclarations = Object.fromEntries(
  BUNDLED_FONTS.map((f) => {
    const normal = `${process.env.NEXT_PUBLIC_APP_URL}${f.regular}`;
    const bold = `${process.env.NEXT_PUBLIC_APP_URL}${f.bold ?? f.regular}`;
    return [f.family, { normal, bold, italics: normal, bolditalics: bold }];
  }),
);

export const fontSizes = [
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "28",
  "29",
  "30",
  "31",
  "32",
  "36",
  "48",
  "60",
  "72",
  "96",
];
