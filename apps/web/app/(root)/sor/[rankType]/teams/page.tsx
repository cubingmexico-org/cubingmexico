import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@workspace/ui/components/tooltip";
import { notFound } from "next/navigation";
import { RankTypeSelector } from "./_components/rank-type-selector";
import Link from "next/link";
import { Metadata } from "next";
import { createSearchParamsCache } from "nuqs/server";
import { getSORTeamsAverage, getSORTeamsSingle } from "./_lib/queries";
import { DeprecatedEventsSwitch } from "@/components/deprecated-events-switch";
import { eventScopeFromDeprecated } from "@/lib/official-events";
import { deprecatedParser } from "@/lib/search-params";
import type { SearchParams } from "@/types";

export const metadata: Metadata = {
  title: "Sum Of Ranks de Teams | Cubing México",
  description:
    "Encuentra el ranking de los mejores equipos de speedcubing en México en cada evento de la WCA. Filtra por estado, género y más.",
};

const searchParamsCache = createSearchParamsCache({
  deprecated: deprecatedParser,
});

interface PageProps {
  params: Promise<{ rankType: "single" | "average" }>;
  searchParams: Promise<SearchParams>;
}

export default async function Page(props: PageProps) {
  const rankType = (await props.params).rankType;

  if (rankType !== "single" && rankType !== "average") {
    return notFound();
  }

  const { deprecated } = searchParamsCache.parse(await props.searchParams);
  const scope = eventScopeFromDeprecated(deprecated);

  const teams =
    rankType === "average"
      ? await getSORTeamsAverage(scope)
      : await getSORTeamsSingle(scope);
  const eventIds = teams[0]?.events.map((event) => event.eventId) ?? [];

  return (
    <>
      <div className="flex flex-col gap-4 mb-6">
        <h1 className="text-3xl font-bold">
          {`Sum of Ranks de Teams (${rankType === "single" ? "Single" : "Average"})`}
        </h1>
        <p>
          El Sum of Ranks de Teams combina los mejores resultados de cada
          miembro del team en cada evento, sumando sus posiciones. Un número más
          bajo indica un mejor desempeño. Este ranking refleja el rendimiento
          colectivo del equipo en competencias oficiales.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <RankTypeSelector selectedRankType={rankType} />
        </div>
        <DeprecatedEventsSwitch />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Total</TableHead>
            {eventIds.map((eventId) => (
              <TableHead key={eventId}>
                <span className={`cubing-icon event-${eventId}`} />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.map((team, index) => (
            <TableRow key={team.stateId}>
              <TableCell>{index + 1}</TableCell>
              <TableCell className="whitespace-nowrap">
                <Link
                  prefetch={false}
                  className="text-link hover:text-link/80"
                  href={`/teams/${team.stateId}`}
                >
                  {team.name}
                </Link>
              </TableCell>
              <TableCell className="font-semibold">{team.overall}</TableCell>
              {team.events.map((event) => (
                <TableCell
                  className={cn(
                    event.bestRank <= 10 && "text-green-500 font-semibold",
                    !event.completed && "text-red-500 font-semibold",
                  )}
                  key={event.eventId}
                >
                  <Tooltip>
                    <TooltipTrigger>{event.bestRank}</TooltipTrigger>
                    {event.personName && (
                      <TooltipContent>
                        <p>{event.personName}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
