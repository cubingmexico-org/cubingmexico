import Link from "next/link";

export function SummaryYearNav({
  year,
  availableYears,
  href,
}: {
  year: number;
  availableYears: number[];
  href: (year: number) => string;
}) {
  return (
    <nav
      aria-label="Años disponibles"
      className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-sm"
    >
      <span className="text-muted-foreground">Año</span>
      {availableYears.map((availableYear) =>
        availableYear === year ? (
          <span
            key={availableYear}
            className="font-semibold text-emerald-600 dark:text-emerald-400"
          >
            {availableYear}
          </span>
        ) : (
          <Link
            key={availableYear}
            href={href(availableYear)}
            prefetch={false}
            className="text-primary hover:underline"
          >
            {availableYear}
          </Link>
        ),
      )}
    </nav>
  );
}
