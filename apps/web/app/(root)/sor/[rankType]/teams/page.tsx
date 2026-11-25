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
import { brandMarkSrc } from "@/lib/brand-image";
import { eventScopeFromDeprecated } from "@/lib/official-events";
import { deprecatedParser } from "@/lib/search-params";
import type { SearchParams } from "@/types";

export const metadata: Metadata = {
  title: "Sum of Ranks de Teams | Cubing México",
  description:
    "Sum of Ranks por Team: suma las mejores posiciones de sus miembros en cada evento.",
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
          Por cada evento se toma el mejor resultado de un miembro del Team y se
          suma su posición nacional. Un total más bajo indica mejor desempeño
          colectivo.
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
          {teams.map((team, index) => {
            const mark = brandMarkSrc(team.icon, team.image);
            return (
              <TableRow key={team.stateId}>
                <TableCell>{index + 1}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <Link
                    prefetch={false}
                    className="inline-flex items-center gap-1.5 text-link hover:text-link/80"
                    href={`/teams/${team.stateId}`}
                  >
                    {mark ? (
                      // eslint-disable-next-line @next/next/no-img-element -- external UploadThing URL
                      <img
                        src={mark}
                        alt=""
                        width={16}
                        height={16}
                        className="size-4 object-contain"
                      />
                    ) : null}
                    {team.name}
                  </Link>
                </TableCell>
                <TableCell className="font-semibold">{team.overall}</TableCell>
                {team.events.map((event) => (
                  <TableCell
                    className={cn(
                      event.bestRank <= 10 &&
                        "text-green-800 dark:text-green-400 font-semibold",
                      !event.completed &&
                        "text-red-700 dark:text-red-400 font-semibold",
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
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}
