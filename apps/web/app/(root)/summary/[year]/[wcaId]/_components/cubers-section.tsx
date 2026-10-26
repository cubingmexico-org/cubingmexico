import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { AccentCell, Stat } from "../../../_components/summary-stat";
import { PersonLink } from "../../../_components/summary-table-cells";
import { objectPronoun } from "../_lib/format";
import type { AnnualSummary, SharedCuber } from "../_lib/queries";

function SharedCubersTable({ rows }: { rows: SharedCuber[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Persona</TableHead>
            <TableHead className="text-center">
              Competencias compartidas
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.wcaId}>
              <TableCell>
                <PersonLink wcaId={row.wcaId} name={row.name} />
              </TableCell>
              <AccentCell>{row.sharedCompetitions}</AccentCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function CubersSection({
  pronoun,
  gender,
  cubers,
}: {
  pronoun: string;
  gender: AnnualSummary["person"]["gender"];
  cubers: AnnualSummary["cubers"];
}) {
  if (cubers.total <= 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Cuberos</h2>
      <p className="text-muted-foreground text-sm sm:text-base">
        {pronoun} coincidió con <Stat>{cubers.total}</Stat>{" "}
        {cubers.total === 1 ? "cubero mexicano" : "cuberos mexicanos"},{" "}
        <Stat>{cubers.repeated}</Stat> de{" "}
        {cubers.repeated === 1
          ? "los cuales compitió"
          : "los cuales compitieron"}{" "}
        con {objectPronoun(gender)} más de una vez. Solo se cuentan cuberos
        mexicanos.
      </p>
      <SharedCubersTable rows={cubers.topShared} />
      {cubers.teammates.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Compañeros de team</h3>
          <p className="text-muted-foreground text-sm sm:text-base">
            De su team estatal, coincidió más veces con:
          </p>
          <SharedCubersTable rows={cubers.teammates} />
        </div>
      )}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Competencias compartidas</TableHead>
              <TableHead className="text-center">Competidores</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cubers.distribution.map((row) => (
              <TableRow key={row.sharedCompetitions}>
                <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {row.sharedCompetitions}
                </TableCell>
                <AccentCell>{row.competitors}</AccentCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell className="font-semibold">Total</TableCell>
              <AccentCell>{cubers.total}</AccentCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
