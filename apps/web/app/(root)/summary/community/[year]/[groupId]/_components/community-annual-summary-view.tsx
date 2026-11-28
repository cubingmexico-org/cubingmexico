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
import { MedalBreakdown } from "../../../../_components/medal-breakdown";
import { SrByEventTable } from "../../../../_components/sr-by-event-table";
import { AccentCell, Stat } from "../../../../_components/summary-stat";
import {
  EventNameCell,
  MedalCells,
  PersonLink,
} from "../../../../_components/summary-table-cells";
import { formatSummaryDate } from "../../../../_lib/format";
import type { CommunityAnnualSummary } from "../_lib/queries";
import { CommunitySummaryHeader } from "./community-summary-header";
import { PersonCountTable } from "./person-count-table";

export function CommunityAnnualSummaryView({
  summary,
}: {
  summary: CommunityAnnualSummary;
}) {
  const {
    community,
    year,
    season,
    biggestTurnout,
    mostActive,
    debuts,
    dominantEvents,
    foreign,
    visitedStates,
    podiums,
    records,
  } = summary;

  const regionalRecordsTotal = records.wr + records.nar + records.nr;

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-4xl flex-col gap-8">
      <CommunitySummaryHeader summary={summary} />

      {season.activeMembers > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Actividad de los miembros</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            En <Stat>{year}</Stat>, <Stat>{season.activeMembers}</Stat>{" "}
            {season.activeMembers === 1
              ? "miembro de la comunidad compitió"
              : "miembros de la comunidad compitieron"}{" "}
            en <Stat>{season.competitionCount}</Stat>{" "}
            {season.competitionCount === 1 ? "competencia" : "competencias"} y{" "}
            <Stat>{season.roundCount}</Stat>{" "}
            {season.roundCount === 1 ? "ronda" : "rondas"} a través de{" "}
            <Stat>{season.eventCount}</Stat>{" "}
            {season.eventCount === 1 ? "evento" : "eventos"}
            {season.firstCompetitionDate && season.lastCompetitionDate ? (
              <>
                , del{" "}
                <Stat>{formatSummaryDate(season.firstCompetitionDate)}</Stat> al{" "}
                <Stat>{formatSummaryDate(season.lastCompetitionDate)}</Stat>
              </>
            ) : null}
            .
          </p>
        </section>
      )}

      {biggestTurnout && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">
            Mayor reunión de la comunidad
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            La mayor reunión de {community.name} fue{" "}
            <Link
              href={`/competitions/${biggestTurnout.competitionId}`}
              prefetch={false}
              className="text-link hover:text-link/80 font-medium"
            >
              {biggestTurnout.competitionName}
            </Link>{" "}
            con <Stat>{biggestTurnout.memberCount}</Stat>{" "}
            {biggestTurnout.memberCount === 1 ? "miembro" : "miembros"}.
          </p>
        </section>
      )}

      {mostActive.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Más activos</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Miembros de la comunidad con más competencias en {year}.
          </p>
          <PersonCountTable rows={mostActive} />
        </section>
      )}

      {debuts > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Debutantes</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            <Stat>{debuts}</Stat>{" "}
            {debuts === 1 ? "miembro debutó" : "miembros debutaron"} en
            competencias WCA durante {year}.
          </p>
        </section>
      )}

      {foreign.competitorCount > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">
            Competencias en el extranjero
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            <Stat>{foreign.competitorCount}</Stat>{" "}
            {foreign.competitorCount === 1
              ? "miembro compitió"
              : "miembros compitieron"}{" "}
            en <Stat>{foreign.competitionCount}</Stat>{" "}
            {foreign.competitionCount === 1
              ? "competencia extranjera"
              : "competencias extranjeras"}
            .
          </p>
          {foreign.topTravelers.length > 0 && (
            <PersonCountTable rows={foreign.topTravelers} />
          )}
        </section>
      )}

      {visitedStates.byState.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Estados visitados</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            <Stat>{visitedStates.competitorCount}</Stat>{" "}
            {visitedStates.competitorCount === 1
              ? "miembro compitió"
              : "miembros compitieron"}{" "}
            en estados de México.
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
                {visitedStates.byState.map((row) => (
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

      {dominantEvents.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Eventos con más podios</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Eventos donde la comunidad acumuló más podios en {year}.
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
                {dominantEvents.map((row) => (
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

      {podiums.total > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Podios</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Los miembros de la comunidad consiguieron{" "}
            <Stat>{podiums.total}</Stat>{" "}
            {podiums.total === 1 ? "podio" : "podios"}:{" "}
            <MedalBreakdown
              gold={podiums.gold}
              silver={podiums.silver}
              bronze={podiums.bronze}
            />
            .
          </p>
          {podiums.topPodiumers.length > 0 && (
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
                  {podiums.topPodiumers.map((row) => (
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
          {podiums.firstTimePodiumers.length > 0 && (
            <p className="text-muted-foreground text-sm sm:text-base">
              <Stat>{podiums.firstTimePodiumers.length}</Stat>{" "}
              {podiums.firstTimePodiumers.length === 1
                ? "miembro subió"
                : "miembros subieron"}{" "}
              al podio por primera vez en {year}.
            </p>
          )}
        </section>
      )}

      {(records.sr > 0 || regionalRecordsTotal > 0) && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Récords</h2>
          {records.sr > 0 && (
            <>
              <p className="text-muted-foreground text-sm sm:text-base">
                Se rompieron <Stat>{records.sr}</Stat> récords estatales (SR).
              </p>
              {records.byEventSr.length > 0 && (
                <SrByEventTable rows={records.byEventSr} />
              )}
              {records.topSrBreakers.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Persona</TableHead>
                        <TableHead className="text-center">SRs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.topSrBreakers.map((row) => (
                        <TableRow key={row.wcaId}>
                          <TableCell>
                            <PersonLink wcaId={row.wcaId} name={row.name} />
                          </TableCell>
                          <AccentCell>{row.count}</AccentCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
          {regionalRecordsTotal > 0 && (
            <>
              <p className="text-muted-foreground text-sm sm:text-base">
                También hubo <Stat>{records.wr}</Stat> WR,{" "}
                <Stat>{records.nar}</Stat> NAR y <Stat>{records.nr}</Stat> NR.
              </p>
              {records.regionalRecords.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Persona</TableHead>
                        <TableHead>Evento</TableHead>
                        <TableHead className="text-center">Tipo</TableHead>
                        <TableHead className="text-center">Resultado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.regionalRecords.map((row, index) => (
                        <TableRow
                          key={`${row.wcaId}-${row.eventId}-${row.type}-${row.resultType}-${index}`}
                        >
                          <TableCell>
                            <PersonLink wcaId={row.wcaId} name={row.name} />
                          </TableCell>
                          <EventNameCell
                            eventId={row.eventId}
                            eventName={row.eventName}
                          />
                          <AccentCell>{row.type}</AccentCell>
                          <AccentCell>
                            {row.resultType === "single" ? "Single" : "Average"}
                          </AccentCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
