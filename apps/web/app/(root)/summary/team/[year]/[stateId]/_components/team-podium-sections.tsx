import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { MedalBreakdown } from "../../../../_components/medal-breakdown";
import { AccentCell, Stat } from "../../../../_components/summary-stat";
import {
  EventNameCell,
  MedalCells,
  PersonLink,
} from "../../../../_components/summary-table-cells";
import { championshipLabel } from "../../../../_lib/format";
import type { TeamAnnualSummary } from "../_lib/queries";

export function TeamPodiumSections({
  year,
  members,
}: {
  year: number;
  members: TeamAnnualSummary["members"];
}) {
  return (
    <>
      {members.dominantEvents.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Eventos con más podios</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Eventos donde el Team acumuló más podios en {year}.
          </p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Oro</TableHead>
                  <TableHead className="text-center">Plata</TableHead>
                  <TableHead className="text-center">Bronce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.dominantEvents.map((row) => (
                  <TableRow key={row.eventId}>
                    <EventNameCell
                      eventId={row.eventId}
                      eventName={row.eventName}
                    />
                    <AccentCell>{row.total}</AccentCell>
                    <MedalCells
                      gold={row.gold}
                      silver={row.silver}
                      bronze={row.bronze}
                    />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {members.podiums.total > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Podios</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Los miembros del Team consiguieron{" "}
            <Stat>{members.podiums.total}</Stat>{" "}
            {members.podiums.total === 1 ? "podio" : "podios"}:{" "}
            <MedalBreakdown
              gold={members.podiums.gold}
              silver={members.podiums.silver}
              bronze={members.podiums.bronze}
            />
            .
          </p>
          {members.podiums.topPodiumers.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Persona</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Oro</TableHead>
                    <TableHead className="text-center">Plata</TableHead>
                    <TableHead className="text-center">Bronce</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.podiums.topPodiumers.map((row) => (
                    <TableRow key={row.wcaId}>
                      <TableCell>
                        <PersonLink wcaId={row.wcaId} name={row.name} />
                      </TableCell>
                      <AccentCell>{row.total}</AccentCell>
                      <MedalCells
                        gold={row.gold}
                        silver={row.silver}
                        bronze={row.bronze}
                      />
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {members.podiums.firstTimePodiumers.length > 0 && (
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm sm:text-base">
                <Stat>{members.podiums.firstTimePodiumers.length}</Stat>{" "}
                {members.podiums.firstTimePodiumers.length === 1
                  ? "persona subió"
                  : "personas subieron"}{" "}
                al podio por primera vez.
              </p>
              <p className="text-muted-foreground text-sm">
                {members.podiums.firstTimePodiumers.map((row, index) => (
                  <span key={row.wcaId}>
                    {index > 0 ? ", " : null}
                    <PersonLink wcaId={row.wcaId} name={row.name} />
                  </span>
                ))}
              </p>
            </div>
          )}
        </section>
      )}

      {members.championshipPodiums.total > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Podios en campeonatos</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            El Team logró <Stat>{members.championshipPodiums.total}</Stat>{" "}
            {members.championshipPodiums.total === 1 ? "podio" : "podios"} en
            campeonatos: <Stat>{members.championshipPodiums.mx}</Stat> nacional
            {members.championshipPodiums.mx === 1 ? "" : "es"},{" "}
            <Stat>{members.championshipPodiums.nac}</Stat> NAC y{" "}
            <Stat>{members.championshipPodiums.world}</Stat> mundial
            {members.championshipPodiums.world === 1 ? "" : "es"}.
          </p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Persona</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Campeonato</TableHead>
                  <TableHead className="text-center">Pos.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.championshipPodiums.rows.map((row, index) => (
                  <TableRow
                    key={`${row.wcaId}-${row.eventId}-${row.championshipType}-${row.competitionName}-${index}`}
                  >
                    <TableCell>
                      <PersonLink wcaId={row.wcaId} name={row.name} />
                    </TableCell>
                    <EventNameCell
                      eventId={row.eventId}
                      eventName={row.eventName}
                    />
                    <TableCell>
                      {championshipLabel(row.championshipType)}
                      <span className="text-muted-foreground text-xs block">
                        {row.competitionName}
                      </span>
                    </TableCell>
                    <AccentCell>{row.position}</AccentCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </>
  );
}
