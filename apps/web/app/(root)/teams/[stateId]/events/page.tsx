import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSearchParamsCache } from "nuqs/server";
import { getStatesGeoJSON, getTeam } from "@/db/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { DeprecatedEventsSwitch } from "@/components/deprecated-events-switch";
import { eventScopeFromDeprecated } from "@/lib/official-events";
import { deprecatedParser, statsWindowParser } from "@/lib/search-params";
import type { SearchParams } from "@/types";
import { getTeamInfo } from "../_lib/queries";
import {
  getPodiumLevels,
  getStateVisitors,
  getTeamEventCutoffs,
  getTeamEventInsights,
} from "./_lib/queries";
import { windowSince } from "./_lib/recommendation";
import { TeamEventsCutoffs } from "./_components/team-events-cutoffs";
import { TeamEventsHighlights } from "./_components/team-events-highlights";
import { TeamEventsDemandChart } from "./_components/team-events-demand-chart";
import { TeamEventsPodiumLevels } from "./_components/team-events-podium-levels";
import { TeamEventsRecommendations } from "./_components/team-events-recommendations";
import { TeamEventsTable } from "./_components/team-events-table";
import { TeamEventsVisitors } from "./_components/team-events-visitors";
import { WindowSelect } from "./_components/window-select";

const searchParamsCache = createSearchParamsCache({
  deprecated: deprecatedParser,
  window: statsWindowParser,
});

type Props = {
  params: Promise<{ stateId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const stateId = (await params).stateId;
  const team = await getTeam(stateId);

  return {
    title: `${team?.name} | Eventos | Cubing México`,
    description: `Eventos más populares de ${team?.name} y cuáles necesitan más rondas en las competencias de ${team?.state}.`,
  };
}

export default async function Page(props: {
  params: Promise<{ stateId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const stateId = (await props.params).stateId;
  const { deprecated, window } = searchParamsCache.parse(
    await props.searchParams,
  );
  const since = windowSince(window);

  const [team, insights, cutoffs, podiumLevels, visitors, statesGeoJSON] =
    await Promise.all([
      getTeamInfo(stateId),
      getTeamEventInsights(
        stateId,
        since,
        eventScopeFromDeprecated(deprecated),
      ),
      getTeamEventCutoffs(stateId, since, windowSince("2y")),
      getPodiumLevels(stateId, since),
      getStateVisitors(stateId, since),
      getStatesGeoJSON(),
    ]);

  if (!team) {
    return notFound();
  }

  const stateName = team.state ?? "";
  const periodLabel = since
    ? `desde ${new Date(since).toLocaleDateString("es-MX", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })}`
    : "histórico";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Eventos</h2>
          <p className="text-sm text-muted-foreground">
            {insights.activeMembers} miembros activos ·{" "}
            {insights.hostedCompetitions} competencias en {stateName} ·{" "}
            {periodLabel}
          </p>
        </div>
        <WindowSelect />
      </div>

      <TeamEventsHighlights events={insights.events} />

      <Card>
        <CardHeader>
          <CardTitle>Interés contra competencias en {stateName}</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamEventsDemandChart events={insights.events} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>¿Qué eventos necesitan más rondas?</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamEventsRecommendations
            events={insights.events}
            stateName={stateName}
            hostedCompetitions={insights.hostedCompetitions}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nivel para podio en {stateName}</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamEventsPodiumLevels levels={podiumLevels} stateName={stateName} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cutoffs sugeridos</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamEventsCutoffs cutoffs={cutoffs} stateName={stateName} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>¿De dónde vienen los competidores?</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamEventsVisitors
            visitors={visitors}
            stateId={stateId}
            stateName={stateName}
            statesGeoJSON={statesGeoJSON}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Todos los eventos</CardTitle>
          <DeprecatedEventsSwitch />
        </CardHeader>
        <CardContent className="space-y-3">
          <TeamEventsTable events={insights.events} />
          <p className="text-xs text-muted-foreground">
            Miembros, rondas y competencias cuentan solo competencias en México
            del periodo elegido. Pasar de ronda y llegar a final cuentan solo
            eventos con más de una ronda, sobre los miembros que compitieron en
            su primera ronda. Interés: de las veces que los miembros fueron a
            una competencia con el evento, en cuántas lo compitieron. Top 100 y
            mejor NR usan los rankings nacionales actuales.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
