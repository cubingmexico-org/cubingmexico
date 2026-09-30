import Link from "next/link";
import {
  Stat,
  StatDescription,
  StatLabel,
  StatValue,
} from "@workspace/ui/components/stat";
import type { getNemesisSummary } from "../_lib/queries";

const numberFormat = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 1,
});

export function NemesisSummary({
  summary,
}: {
  summary: Awaited<ReturnType<typeof getNemesisSummary>>;
}) {
  const invictosPct =
    summary.competitors > 0
      ? (summary.invictos / summary.competitors) * 100
      : 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat>
        <StatLabel>Competidores analizados</StatLabel>
        <StatValue className="tabular-nums">
          {numberFormat.format(summary.competitors)}
        </StatValue>
        <StatDescription>Con al menos un resultado oficial</StatDescription>
      </Stat>
      <Stat>
        <StatLabel>Invictos</StatLabel>
        <StatValue className="tabular-nums">
          {numberFormat.format(summary.invictos)}
        </StatValue>
        <StatDescription>
          {numberFormat.format(invictosPct)}% no tiene ningún némesis
        </StatDescription>
      </Stat>
      <Stat>
        <StatLabel>Némesis por competidor</StatLabel>
        <StatValue className="tabular-nums">
          {numberFormat.format(summary.averageNemeses)}
        </StatValue>
        <StatDescription>
          Promedio · mediana {numberFormat.format(summary.medianNemeses)}
        </StatDescription>
      </Stat>
      <Stat>
        <StatLabel>Más nemesizador</StatLabel>
        <StatValue className="text-lg truncate">
          {summary.topNemesized ? (
            <Link
              href={`/persons/${summary.topNemesized.personId}`}
              className="text-link hover:text-link/80"
            >
              {summary.topNemesized.name ?? summary.topNemesized.personId}
            </Link>
          ) : (
            "-"
          )}
        </StatValue>
        <StatDescription>
          {summary.topNemesized
            ? `Némesis de ${numberFormat.format(summary.topNemesized.nemesizedCount)} competidores`
            : "Sin datos"}
        </StatDescription>
      </Stat>
    </div>
  );
}
