import { Stat } from "../../../../_components/summary-stat";
import { formatSummaryDate } from "../../../../_lib/format";
import type { TeamAnnualSummary } from "../_lib/queries";
import { PersonCountTable } from "./person-count-table";

type Members = TeamAnnualSummary["members"];

function formatDelta(n: number): string {
  if (n > 0) return `+${n.toLocaleString("es-MX")}`;
  return n.toLocaleString("es-MX");
}

export function TeamActivitySections({
  year,
  members,
}: {
  year: number;
  members: Members;
}) {
  return (
    <>
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
    </>
  );
}

export function TeamMostActiveSection({
  year,
  mostActive,
}: {
  year: number;
  mostActive: Members["mostActive"];
}) {
  if (mostActive.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Más activos</h2>
      <p className="text-muted-foreground text-sm sm:text-base">
        Miembros del Team con más competencias en {year}.
      </p>
      <PersonCountTable rows={mostActive} />
    </section>
  );
}
