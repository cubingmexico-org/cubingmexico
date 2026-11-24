export const CUBING_MEXICO_INSTAGRAM_URL = "https://instagram.com/cubingmexico";

/** Funding disclaimer + Instagram CTA for sponsors surfaces. */
export function SponsorsSupportNotice({ className }: { className?: string }) {
  const linkClass = "underline hover:opacity-80";

  return (
    <p className={className}>
      Este sitio existe gracias a sus patrocinadores. Quienes patrocinan tienen
      su equipo activo en el sitio con rankings y récords. Si quieres que tu
      equipo aparezca, escríbenos por Instagram{" "}
      <a
        href={CUBING_MEXICO_INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        @cubingmexico
      </a>
      .
    </p>
  );
}
