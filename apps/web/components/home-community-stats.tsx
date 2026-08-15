type HomeCommunityStatsProps = {
  persons: number;
  competitions: number;
};

export function HomeCommunityStats({
  persons,
  competitions,
}: HomeCommunityStatsProps) {
  return (
    <section className="border-t border-border bg-background">
      <div className="container mx-auto px-5 py-20 md:py-28">
        <h2 className="font-display text-4xl font-bold uppercase tracking-wide text-foreground md:text-5xl">
          Comunidad
        </h2>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground md:text-xl">
          Desde el año 2008,{" "}
          <span className="font-semibold text-foreground">
            {persons.toLocaleString("es-MX")} mexicanos
          </span>{" "}
          han participado en{" "}
          <span className="font-semibold text-foreground">
            {competitions.toLocaleString("es-MX")} competencias oficiales
          </span>{" "}
          celebradas en todo el país.
        </p>
      </div>
    </section>
  );
}
