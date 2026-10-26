import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { AccentCell, Stat } from "../../../_components/summary-stat";
import { prevYearLabel } from "../_lib/format";
import type { AnnualSummary } from "../_lib/queries";

export function MollerzSection({
  year,
  mollerz,
}: {
  year: number;
  mollerz: AnnualSummary["mollerz"];
}) {
  if (!mollerz) return null;

  const beforeLabel = prevYearLabel(year);

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Sistema Mollerz</h2>
      <p className="text-muted-foreground text-sm sm:text-base">
        Nivel {beforeLabel}: <Stat>{mollerz.tierBefore ?? "—"}</Stat>
        {" → "}
        {year}: <Stat>{mollerz.tierAfter ?? "—"}</Stat>
        {mollerz.tierBefore !== mollerz.tierAfter &&
          mollerz.tierAfter !== null && <> (subió de nivel en {year})</>}
        .
      </p>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Condición</TableHead>
              <TableHead className="text-center">{beforeLabel}</TableHead>
              <TableHead className="text-center">{year}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Averages de speedsolving</TableCell>
              <TableCell className="text-center">
                {mollerz.conditionsBefore?.numberOfSpeedsolvingAverages ?? "—"}
                /12
              </TableCell>
              <AccentCell>
                {mollerz.conditionsAfter.numberOfSpeedsolvingAverages}/12
              </AccentCell>
            </TableRow>
            <TableRow>
              <TableCell>Means BLD/FMC</TableCell>
              <TableCell className="text-center">
                {mollerz.conditionsBefore?.numberOfBLDFMCMeans ?? "—"}/4
              </TableCell>
              <AccentCell>
                {mollerz.conditionsAfter.numberOfBLDFMCMeans}/4
              </AccentCell>
            </TableRow>
            <TableRow>
              <TableCell>WR</TableCell>
              <TableCell className="text-center">
                {mollerz.conditionsBefore
                  ? mollerz.conditionsBefore.hasWorldRecord
                    ? "Sí"
                    : "No"
                  : "—"}
              </TableCell>
              <AccentCell>
                {mollerz.conditionsAfter.hasWorldRecord ? "Sí" : "No"}
              </AccentCell>
            </TableRow>
            <TableRow>
              <TableCell>Podio Mundial</TableCell>
              <TableCell className="text-center">
                {mollerz.conditionsBefore
                  ? mollerz.conditionsBefore.hasWorldChampionshipPodium
                    ? "Sí"
                    : "No"
                  : "—"}
              </TableCell>
              <AccentCell>
                {mollerz.conditionsAfter.hasWorldChampionshipPodium
                  ? "Sí"
                  : "No"}
              </AccentCell>
            </TableRow>
            <TableRow>
              <TableCell>Eventos ganados</TableCell>
              <TableCell className="text-center">
                {mollerz.conditionsBefore?.eventsWon ?? "—"}/17
              </TableCell>
              <AccentCell>{mollerz.conditionsAfter.eventsWon}/17</AccentCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
