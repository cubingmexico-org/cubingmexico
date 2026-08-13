import { normalizeSearchText } from "@/lib/search";

export type SitePage = {
  title: string;
  href: string;
  keywords?: string[];
};

/** Main navigable destinations for site-wide search shortcuts. */
export const SITE_PAGES: SitePage[] = [
  { title: "Inicio", href: "/", keywords: ["home", "cubing mexico"] },
  {
    title: "Competencias",
    href: "/competitions",
    keywords: ["competitions", "eventos"],
  },
  {
    title: "Teams estatales",
    href: "/teams",
    keywords: ["equipos", "estados"],
  },
  {
    title: "Rankings",
    href: "/rankings/333/single",
    keywords: ["clasificación", "tiempos"],
  },
  { title: "Récords", href: "/records", keywords: ["records", "nr", "sr"] },
  {
    title: "Sum of Ranks",
    href: "/sor/single",
    keywords: ["sor", "suma de ranks"],
  },
  {
    title: "Sum of Ranks (Teams)",
    href: "/sor/single/teams",
    keywords: ["sor teams"],
  },
  {
    title: "Sum of State Ranks",
    href: "/sosr/MEX/single",
    keywords: ["sosr", "suma de ranks estatales"],
  },
  { title: "Kinch Ranks", href: "/kinch", keywords: ["kinch"] },
  {
    title: "Kinch Ranks estatales",
    href: "/kinch/MEX",
    keywords: ["kinch estatal"],
  },
  {
    title: "Kinch Ranks (Teams)",
    href: "/kinch/teams",
    keywords: ["kinch teams"],
  },
  {
    title: "Rachas de PRs",
    href: "/streaks",
    keywords: ["streaks", "pr"],
  },
  {
    title: "Competidores",
    href: "/persons",
    keywords: ["personas", "cuberos"],
  },
  {
    title: "Organizadores",
    href: "/organizers",
    keywords: ["organizers"],
  },
  { title: "Delegados", href: "/delegates", keywords: ["delegates"] },
  {
    title: "Miembros (Sistema Mollerz)",
    href: "/members",
    keywords: ["mollerz", "membresía"],
  },
  { title: "Acerca de", href: "/about", keywords: ["about"] },
  {
    title: "Preguntas frecuentes",
    href: "/faq",
    keywords: ["faq", "ayuda"],
  },
  {
    title: "Aviso de privacidad",
    href: "/aviso-de-privacidad",
    keywords: ["privacidad", "aviso", "legal", "arco", "datos"],
  },
  {
    title: "Términos de uso",
    href: "/terminos",
    keywords: ["términos", "terminos", "legal", "condiciones"],
  },
  { title: "Logotipo", href: "/logo", keywords: ["logo", "brand"] },
  {
    title: "Herramientas",
    href: "/tools",
    keywords: ["tools", "utilidades"],
  },
];

export function filterSitePages(query: string): SitePage[] {
  const q = normalizeSearchText(query.trim());
  if (!q) return SITE_PAGES;

  return SITE_PAGES.filter((page) => {
    const haystack = normalizeSearchText(
      [page.title, page.href, ...(page.keywords ?? [])].join(" "),
    );
    return haystack.includes(q);
  });
}
