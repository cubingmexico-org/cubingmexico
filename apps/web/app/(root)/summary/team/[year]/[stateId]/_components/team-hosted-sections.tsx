import Link from "next/link";
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
import { EventNameCell } from "../../../../_components/summary-table-cells";
import { formatSummaryDate } from "../../../../_lib/format";
import type { TeamAnnualSummary } from "../_lib/queries";
import { PersonCountTable } from "./person-count-table";

type Team = TeamAnnualSummary["team"];
type Hosted = TeamAnnualSummary["hosted"];

export function TeamHostedSections({
  year,
  team,
  hosted,
}: {
  year: number;
  team: Team;
  hosted: Hosted;
}) {
  return (
    <>
      {hosted.competitionCount > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Competencias en el estado</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            En <Stat>{year}</Stat> se organizaron{" "}
            <Stat>{hosted.competitionCount}</Stat>{" "}
            {hosted.competitionCount === 1 ? "competencia" : "competencias"} en{" "}
            {team.stateName}
            {hosted.firstCompetitionDate && hosted.lastCompetitionDate ? (
              <>
                , del{" "}
                <Stat>{formatSummaryDate(hosted.firstCompetitionDate)}</Stat> al{" "}
                <Stat>{formatSummaryDate(hosted.lastCompetitionDate)}</Stat>
              </>
            ) : null}
            .
          </p>
          <p className="text-muted-foreground text-sm sm:text-base">
            Participaron <Stat>{hosted.totalCompetitors}</Stat>{" "}
            {hosted.totalCompetitors === 1 ? "competidor" : "competidores"} en
            total, de los cuales <Stat>{hosted.teamCompetitors}</Stat> eran del
            Team
            {hosted.newcomers > 0 ? (
              <>
                {" "}
                (incluyendo <Stat>{hosted.newcomers}</Stat>{" "}
                {hosted.newcomers === 1 ? "debutante" : "debutantes"})
              </>
            ) : null}
            .
          </p>
          {hosted.biggestCompetition && (
            <p className="text-muted-foreground text-sm sm:text-base">
              La competencia con más asistencia fue{" "}
              <Link
                href={`/competitions/${hosted.biggestCompetition.id}`}
                prefetch={false}
                className="text-link hover:text-link/80 font-medium"
              >
                {hosted.biggestCompetition.name}
              </Link>{" "}
              con <Stat>{hosted.biggestCompetition.competitors}</Stat>{" "}
              {hosted.biggestCompetition.competitors === 1
                ? "competidor"
                : "competidores"}
              .
            </p>
          )}
        </section>
      )}

      {hosted.popularEvents.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Eventos más populares</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Eventos con más rondas en competencias organizadas en el estado.
          </p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead className="text-center">Rondas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hosted.popularEvents.map((row) => (
                  <TableRow key={row.eventId}>
                    <EventNameCell
                      eventId={row.eventId}
                      eventName={row.eventName}
                    />
                    <AccentCell>{row.rounds}</AccentCell>
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

export function TeamHostedStatsSections({
  team,
  hosted,
}: {
  team: Team;
  hosted: Hosted;
}) {
  return (
    <>
      {hosted.solves.totalSolves > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Resoluciones</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            En las competencias del estado se registraron{" "}
            <Stat>{hosted.solves.totalSolves.toLocaleString("es-MX")}</Stat>{" "}
            resoluciones exitosas.
          </p>
          {hosted.solves.totalDnfs > 0 && (
            <p className="text-muted-foreground text-sm">
              Además hubo{" "}
              <Stat>{hosted.solves.totalDnfs.toLocaleString("es-MX")}</Stat> DNF
              (no incluidos en el total).
            </p>
          )}
        </section>
      )}

      {hosted.visitors.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Visitantes</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Competidores de otros estados que visitaron competencias en{" "}
            {team.stateName}.
          </p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Competidores</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hosted.visitors.map((row) => (
                  <TableRow key={row.stateId}>
                    <TableCell>
                      <StateLabel
                        stateId={row.stateId}
                        stateName={row.stateName}
                      />
                    </TableCell>
                    <AccentCell>{row.competitors}</AccentCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {hosted.recurringVisitors.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Visitantes recurrentes</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Competidores de otros estados que asistieron a al menos 2
            competencias en {team.stateName}.
          </p>
          <PersonCountTable rows={hosted.recurringVisitors} />
        </section>
      )}
    </>
  );
}
