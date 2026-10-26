import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { StateLabel } from "@/components/state-flag";
import { AccentCell, Stat } from "../../../../_components/summary-stat";
import { PersonLink } from "../../../../_components/summary-table-cells";
import type { TeamAnnualSummary } from "../_lib/queries";
import { PersonCountTable } from "./person-count-table";

export function TeamTravelSections({
  stateName,
  members,
}: {
  stateName: string;
  members: TeamAnnualSummary["members"];
}) {
  return (
    <>
      {members.foreign.competitorCount > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">
            Competencias en el extranjero
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            <Stat>{members.foreign.competitorCount}</Stat>{" "}
            {members.foreign.competitorCount === 1
              ? "miembro compitió"
              : "miembros compitieron"}{" "}
            en <Stat>{members.foreign.competitionCount}</Stat>{" "}
            {members.foreign.competitionCount === 1
              ? "competencia extranjera"
              : "competencias extranjeras"}
            .
          </p>
          {members.foreign.topTravelers.length > 0 && (
            <PersonCountTable rows={members.foreign.topTravelers} />
          )}
        </section>
      )}

      {members.otherMexicanStates.competitorCount > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Viajes dentro de México</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            <Stat>{members.otherMexicanStates.competitorCount}</Stat>{" "}
            {members.otherMexicanStates.competitorCount === 1
              ? "miembro compitió"
              : "miembros compitieron"}{" "}
            en otros estados.
          </p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Competidores</TableHead>
                  <TableHead className="text-center">Competencias</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.otherMexicanStates.byState.map((row) => (
                  <TableRow key={row.stateId}>
                    <TableCell>
                      <StateLabel
                        stateId={row.stateId}
                        stateName={row.stateName}
                      />
                    </TableCell>
                    <AccentCell>{row.competitors}</AccentCell>
                    <AccentCell>{row.competitions}</AccentCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {members.firstTimeAway.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">
            Primera vez fuera del estado
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            <Stat>{members.firstTimeAway.length}</Stat>{" "}
            {members.firstTimeAway.length === 1
              ? "miembro compitió"
              : "miembros compitieron"}{" "}
            fuera de {stateName} por primera vez.
          </p>
          <p className="text-muted-foreground text-sm">
            {members.firstTimeAway.map((row, index) => (
              <span key={row.wcaId}>
                {index > 0 ? ", " : null}
                <PersonLink wcaId={row.wcaId} name={row.name} />
              </span>
            ))}
          </p>
        </section>
      )}
    </>
  );
}
