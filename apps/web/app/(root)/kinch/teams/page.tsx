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
import Link from "next/link";
import { getKinchRanksTeams } from "./_lib/queries";
import { crossEventIds } from "@/lib/constants";
import { DeprecatedEventsSwitch } from "@/components/deprecated-events-switch";
import { eventScopeFromDeprecated } from "@/lib/official-events";
import { deprecatedParser } from "@/lib/search-params";
import { createSearchParamsCache } from "nuqs/server";
import type { SearchParams } from "@/types";

const searchParamsCache = createSearchParamsCache({
  deprecated: deprecatedParser,
});

export default async function Page(props: {
  searchParams: Promise<SearchParams>;
}) {
  const { deprecated } = searchParamsCache.parse(await props.searchParams);
  const scope = eventScopeFromDeprecated(deprecated);
  const teams = await getKinchRanksTeams(scope);

  return (
    <>
      <DeprecatedEventsSwitch />
      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Total</TableHead>
            {crossEventIds(scope).map((eventId) => (
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
              <TableCell className="font-semibold">
                {team.overall.toFixed(2)}
              </TableCell>
              {team.events.map((event) => (
                <TableCell
                  key={event.eventId}
                  className={cn(
                    event.ratio === 0 && "text-red-500 font-semibold",
                    event.ratio === 100 && "text-green-500 font-semibold",
                  )}
                >
                  <Tooltip>
                    <TooltipTrigger>{event.ratio.toFixed(2)}</TooltipTrigger>
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
