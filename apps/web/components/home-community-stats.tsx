type HomeCommunityStatsProps = {
  persons: number;
  competitions: number;
};

export function HomeCommunityStats({
  persons,
  competitions,
}: HomeCommunityStatsProps) {
  return (
    <section className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-end sm:justify-between sm:px-6 md:py-12">
        <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
          Desde 2008, la comunidad mexicana ha crecido con cada competencia
          oficial de la WCA.
        </p>
        <dl className="flex gap-10 sm:gap-14">
          <div>
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Competidores
            </dt>
            <dd className="mt-1 font-display text-3xl font-bold tabular-nums tracking-wide text-foreground md:text-4xl">
              {persons.toLocaleString("es-MX")}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Competencias
            </dt>
            <dd className="mt-1 font-display text-3xl font-bold tabular-nums tracking-wide text-foreground md:text-4xl">
              {competitions.toLocaleString("es-MX")}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
