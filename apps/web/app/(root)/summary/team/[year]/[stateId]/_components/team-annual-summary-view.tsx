import Link from "next/link";
import type { ReactNode } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import { StateLabel } from "@/components/state-flag";
import type { TeamAnnualSummary } from "../_lib/queries";
import { getTeamShareHighlights } from "../_lib/share-highlights";
import { TeamSummaryShareButton } from "./team-summary-share-button";

function formatSummaryDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

function formatDelta(n: number): string {
  if (n > 0) return `+${n.toLocaleString("es-MX")}`;
  return n.toLocaleString("es-MX");
}

function championshipLabel(type: string): string {
  switch (type) {
    case "MX":
      return "Nacional";
    case "_North America":
      return "NAC";
    case "world":
      return "Mundial";
    default:
      return type;
  }
}

type StatTone = "default" | "gold" | "silver" | "bronze";

function Stat({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: StatTone;
}) {
  return (
    <span
      className={cn(
        "inline-block font-bold text-[1.15em] leading-none mx-0.5",
        tone === "default" && "text-emerald-600 dark:text-emerald-400",
        tone === "gold" && "text-amber-500 dark:text-amber-400",
        tone === "silver" && "text-slate-500 dark:text-slate-300",
        tone === "bronze" && "text-yellow-700 dark:text-yellow-600",
      )}
    >
      {children}
    </span>
  );
}

function AccentCell({ children }: { children: ReactNode }) {
  return (
    <TableCell className="text-center font-semibold text-emerald-600 dark:text-emerald-400">
      {children}
    </TableCell>
  );
}

function PersonLink({ wcaId, name }: { wcaId: string; name: string | null }) {
  return (
    <Link href={`/persons/${wcaId}`} className="text-link hover:text-link/80">
      {name ?? wcaId}
    </Link>
  );
}

type Props = {
  summary: TeamAnnualSummary;
};

export function TeamAnnualSummaryView({ summary }: Props) {
  const { team, year, availableYears, hosted, members, staff } = summary;

  const shareData = {
    name: team.name,
    stateName: team.stateName,
    stateId: team.stateId,
    image: team.image,
    year,
    highlights: getTeamShareHighlights(summary),
  };

  const teamInitials =
    team.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 3) || team.stateId;

  const regionalRecordsTotal =
    members.records.wr + members.records.nar + members.records.nr;

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      <div className="text-center space-y-3">
        <Link
          href={`/teams/${team.stateId}`}
          className="mx-auto inline-flex"
          aria-label={`Ver ${team.name}`}
        >
          <Avatar className="size-20 sm:size-24 border-2 border-border shadow-sm">
            <AvatarImage src={team.image ?? undefined} alt={team.name} />
            <AvatarFallback className="text-lg font-semibold">
              {teamInitials}
            </AvatarFallback>
          </Avatar>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold">
          <Link
            href={`/teams/${team.stateId}`}
            className="text-link hover:text-link/80"
          >
            {team.name}
          </Link>
          {` — Resumen anual `}
          <Stat>{year}</Stat>
        </h1>
        <p className="text-sm text-muted-foreground">
          <StateLabel stateId={team.stateId} stateName={team.stateName} />
          {" · "}
          <Link
            href={`/teams/${team.stateId}`}
            className="text-primary hover:underline"
          >
            Ver Team
          </Link>
        </p>
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
                href={`/summary/team/${availableYear}/${team.stateId}`}
                className="text-primary hover:underline"
              >
                {availableYear}
              </Link>
            ),
          )}
        </nav>
        {shareData.highlights.length > 0 && (
          <div className="flex justify-center pt-1">
            <TeamSummaryShareButton data={shareData} />
          </div>
        )}
      </div>

      {members.season.activeMembers > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Actividad de los miembros</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            En <Stat>{year}</Stat>, <Stat>{members.season.activeMembers}</Stat>{" "}
            {members.season.activeMembers === 1
              ? "miembro del Team compitió"
              : "miembros del Team compitieron"}{" "}
            en <Stat>{members.season.competitionCount}</Stat>{" "}
            {members.season.competitionCount === 1
              ? "competencia"
              : "competencias"}{" "}
            y <Stat>{members.season.roundCount}</Stat>{" "}
            {members.season.roundCount === 1 ? "ronda" : "rondas"} a través de{" "}
            <Stat>{members.season.eventCount}</Stat>{" "}
            {members.season.eventCount === 1 ? "evento" : "eventos"}
            {members.season.firstCompetitionDate &&
            members.season.lastCompetitionDate ? (
              <>
                , del{" "}
                <Stat>
                  {formatSummaryDate(members.season.firstCompetitionDate)}
                </Stat>{" "}
                al{" "}
                <Stat>
                  {formatSummaryDate(members.season.lastCompetitionDate)}
                </Stat>
              </>
            ) : null}
            .
          </p>
        </section>
      )}

      {members.growth.prevYear !== null && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Crecimiento</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Respecto a <Stat>{members.growth.prevYear}</Stat>
            {members.growth.activeMembersDelta !== null ? (
              <>
                : <Stat>{formatDelta(members.growth.activeMembersDelta)}</Stat>{" "}
                {Math.abs(members.growth.activeMembersDelta) === 1
                  ? "miembro activo"
                  : "miembros activos"}
              </>
            ) : null}
            {members.growth.hostedCompetitionsDelta !== null ? (
              <>
                ,{" "}
                <Stat>
                  {formatDelta(members.growth.hostedCompetitionsDelta)}
                </Stat>{" "}
                {Math.abs(members.growth.hostedCompetitionsDelta) === 1
                  ? "competencia organizada"
                  : "competencias organizadas"}
              </>
            ) : null}
            {members.growth.podiumsDelta !== null ? (
              <>
                {" "}
                y <Stat>{formatDelta(members.growth.podiumsDelta)}</Stat>{" "}
                {Math.abs(members.growth.podiumsDelta) === 1
                  ? "podio"
                  : "podios"}
              </>
            ) : null}
            .
          </p>
        </section>
      )}

      {members.retention.previousActive > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Retención</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            <Stat>{members.retention.returned}</Stat> de{" "}
            <Stat>{members.retention.previousActive}</Stat>{" "}
            {members.retention.previousActive === 1
              ? "miembro activo"
              : "miembros activos"}{" "}
            de <Stat>{year - 1}</Stat> volvieron a competir en {year}.
          </p>
        </section>
      )}

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
                    <TableCell>
                      <span className={`cubing-icon event-${row.eventId}`} />
                      <span className="ml-2">{row.eventName}</span>
                    </TableCell>
                    <AccentCell>{row.rounds}</AccentCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Persona</TableHead>
                  <TableHead className="text-center">Competencias</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hosted.recurringVisitors.map((row) => (
                  <TableRow key={row.wcaId}>
                    <TableCell>
                      <PersonLink wcaId={row.wcaId} name={row.name} />
                    </TableCell>
                    <AccentCell>{row.competitions}</AccentCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {members.mostActive.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Más activos</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Miembros del Team con más competencias en {year}.
          </p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Persona</TableHead>
                  <TableHead className="text-center">Competencias</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.mostActive.map((row) => (
                  <TableRow key={row.wcaId}>
                    <TableCell>
                      <PersonLink wcaId={row.wcaId} name={row.name} />
                    </TableCell>
                    <AccentCell>{row.competitions}</AccentCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Persona</TableHead>
                    <TableHead className="text-center">Competencias</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.foreign.topTravelers.map((row) => (
                    <TableRow key={row.wcaId}>
                      <TableCell>
                        <PersonLink wcaId={row.wcaId} name={row.name} />
                      </TableCell>
                      <AccentCell>{row.competitions}</AccentCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
            fuera de {team.stateName} por primera vez.
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

      {members.biggestTurnout && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Mayor reunión del Team</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            La mayor reunión del Team fue{" "}
            <Link
              href={`/competitions/${members.biggestTurnout.competitionId}`}
              className="text-link hover:text-link/80 font-medium"
            >
              {members.biggestTurnout.competitionName}
            </Link>{" "}
            con <Stat>{members.biggestTurnout.memberCount}</Stat>{" "}
            {members.biggestTurnout.memberCount === 1 ? "miembro" : "miembros"}.
          </p>
        </section>
      )}

      {members.mostDiverseComp && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Competencia con más Teams</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            La competencia con más Teams distintos fue{" "}
            <Link
              href={`/competitions/${members.mostDiverseComp.competitionId}`}
              className="text-link hover:text-link/80 font-medium"
            >
              {members.mostDiverseComp.competitionName}
            </Link>
            , con <Stat>{members.mostDiverseComp.distinctTeams}</Stat>{" "}
            {members.mostDiverseComp.distinctTeams === 1
              ? "otro Team"
              : "otros Teams"}
            .
          </p>
        </section>
      )}

      {members.crossedTeams.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">
            Teams con los que más coincidimos
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Otros Teams presentes en las mismas competencias.
          </p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-center">Competencias</TableHead>
                  <TableHead className="text-center">Competidores</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.crossedTeams.map((row) => {
                  const initials =
                    row.teamName
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 3) || row.stateId;
                  return (
                    <TableRow key={row.stateId}>
                      <TableCell>
                        <Link
                          href={`/teams/${row.stateId}`}
                          className="inline-flex items-center gap-2 text-link hover:text-link/80"
                        >
                          <Avatar className="size-7 border border-border">
                            <AvatarImage
                              src={row.teamImage ?? undefined}
                              alt={row.teamName}
                            />
                            <AvatarFallback className="text-[10px] font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{row.teamName}</span>
                        </Link>
                      </TableCell>
                      <AccentCell>{row.sharedCompetitions}</AccentCell>
                      <AccentCell>{row.competitorsMet}</AccentCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {members.debuts > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Debutantes del Team</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            <Stat>{members.debuts}</Stat>{" "}
            {members.debuts === 1 ? "miembro debutó" : "miembros debutaron"} en
            la WCA este año.
          </p>
        </section>
      )}

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
                    <TableCell>
                      <span className={`cubing-icon event-${row.eventId}`} />
                      <span className="ml-2">{row.eventName}</span>
                    </TableCell>
                    <AccentCell>{row.total}</AccentCell>
                    <TableCell className="text-center font-semibold text-amber-500 dark:text-amber-400">
                      {row.gold || ""}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-slate-500 dark:text-slate-300">
                      {row.silver || ""}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-yellow-700 dark:text-yellow-600">
                      {row.bronze || ""}
                    </TableCell>
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
            <Stat tone="gold">{members.podiums.gold}</Stat>{" "}
            {members.podiums.gold === 1 ? "oro" : "oros"},{" "}
            <Stat tone="silver">{members.podiums.silver}</Stat>{" "}
            {members.podiums.silver === 1 ? "plata" : "platas"} y{" "}
            <Stat tone="bronze">{members.podiums.bronze}</Stat>{" "}
            {members.podiums.bronze === 1 ? "bronce" : "bronces"}.
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
                      <TableCell className="text-center font-semibold text-amber-500 dark:text-amber-400">
                        {row.gold || ""}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-slate-500 dark:text-slate-300">
                        {row.silver || ""}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-yellow-700 dark:text-yellow-600">
                        {row.bronze || ""}
                      </TableCell>
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
                    <TableCell>
                      <span className={`cubing-icon event-${row.eventId}`} />
                      <span className="ml-2">{row.eventName}</span>
                    </TableCell>
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

      {(members.records.sr > 0 || regionalRecordsTotal > 0) && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Récords</h2>
          {members.records.sr > 0 && (
            <>
              <p className="text-muted-foreground text-sm sm:text-base">
                Se rompieron <Stat>{members.records.sr}</Stat> récords estatales
                (SR).
              </p>
              {members.records.byEventSr.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Evento</TableHead>
                        <TableHead className="text-center">SR single</TableHead>
                        <TableHead className="text-center">
                          SR average
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.records.byEventSr.map((row) => (
                        <TableRow key={row.eventId}>
                          <TableCell>
                            <span
                              className={`cubing-icon event-${row.eventId}`}
                            />
                            <span className="ml-2">{row.eventName}</span>
                          </TableCell>
                          <AccentCell>{row.single || ""}</AccentCell>
                          <AccentCell>{row.average || ""}</AccentCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {members.records.topSrBreakers.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Persona</TableHead>
                        <TableHead className="text-center">SRs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.records.topSrBreakers.map((row) => (
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
                También hubo <Stat>{members.records.wr}</Stat> WR,{" "}
                <Stat>{members.records.nar}</Stat> NAR y{" "}
                <Stat>{members.records.nr}</Stat> NR.
              </p>
              {members.records.regionalRecords.length > 0 && (
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
                      {members.records.regionalRecords.map((row, index) => (
                        <TableRow
                          key={`${row.wcaId}-${row.eventId}-${row.type}-${row.resultType}-${index}`}
                        >
                          <TableCell>
                            <PersonLink wcaId={row.wcaId} name={row.name} />
                          </TableCell>
                          <TableCell>
                            <span
                              className={`cubing-icon event-${row.eventId}`}
                            />
                            <span className="ml-2">{row.eventName}</span>
                          </TableCell>
                          <AccentCell>{row.type}</AccentCell>
                          <TableCell className="text-center">
                            {row.resultType}
                          </TableCell>
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

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Kinch y Sum of Ranks</h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          Puntajes del Team (mejor miembro por evento) al inicio y al final de{" "}
          {year}.
        </p>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Métrica</TableHead>
                <TableHead className="text-center">{year - 1}</TableHead>
                <TableHead className="text-center">{year}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Kinch overall</TableCell>
                <TableCell className="text-center">
                  {members.kinchSor.kinchBefore.toFixed(2)}
                </TableCell>
                <AccentCell>
                  {members.kinchSor.kinchAfter.toFixed(2)}
                </AccentCell>
              </TableRow>
              <TableRow>
                <TableCell>Sum of Ranks (single)</TableCell>
                <TableCell className="text-center">
                  {members.kinchSor.sorSingleBefore}
                </TableCell>
                <AccentCell>{members.kinchSor.sorSingleAfter}</AccentCell>
              </TableRow>
              <TableRow>
                <TableCell>Sum of Ranks (average)</TableCell>
                <TableCell className="text-center">
                  {members.kinchSor.sorAverageBefore}
                </TableCell>
                <AccentCell>{members.kinchSor.sorAverageAfter}</AccentCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>

      {(staff.newDelegates.length > 0 ||
        staff.hostedOrganizers.length > 0 ||
        staff.hostedDelegates.length > 0) && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Organización</h2>
          {staff.newDelegates.length > 0 && (
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm sm:text-base">
                <Stat>{staff.newDelegates.length}</Stat>{" "}
                {staff.newDelegates.length === 1
                  ? "persona delegó"
                  : "personas delegaron"}{" "}
                por primera vez en {year}.
              </p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Persona</TableHead>
                      <TableHead>Primera competencia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staff.newDelegates.map((row) => (
                      <TableRow key={row.wcaId}>
                        <TableCell>
                          <PersonLink wcaId={row.wcaId} name={row.name} />
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/competitions/${row.firstCompetitionId}`}
                            className="text-link hover:text-link/80"
                          >
                            {row.firstCompetitionName}
                          </Link>
                          <span className="text-muted-foreground text-xs block">
                            {formatSummaryDate(row.firstCompetitionDate)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          {staff.hostedOrganizers.length > 0 && (
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm sm:text-base">
                Organizadores del Team en competencias del estado:
              </p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Persona</TableHead>
                      <TableHead className="text-center">
                        Competencias
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staff.hostedOrganizers.map((row) => (
                      <TableRow key={row.wcaId}>
                        <TableCell>
                          <PersonLink wcaId={row.wcaId} name={row.name} />
                        </TableCell>
                        <AccentCell>{row.competitions}</AccentCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          {staff.hostedDelegates.length > 0 && (
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm sm:text-base">
                Delegados del Team en competencias del estado:
              </p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Persona</TableHead>
                      <TableHead className="text-center">
                        Competencias
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staff.hostedDelegates.map((row) => (
                      <TableRow key={row.wcaId}>
                        <TableCell>
                          <PersonLink wcaId={row.wcaId} name={row.name} />
                        </TableCell>
                        <AccentCell>{row.competitions}</AccentCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
