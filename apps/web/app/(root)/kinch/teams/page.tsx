import { TableCell, TableRow } from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@workspace/ui/components/tooltip";
import Link from "next/link";
import { getKinchRanksTeams } from "./_lib/queries";

export default async function Page() {
  const teams = await getKinchRanksTeams();

  return (
    <>
      {teams.map((team, index) => (
        <TableRow key={team.stateId}>
          <TableCell>{index + 1}</TableCell>
          <TableCell className="whitespace-nowrap">
            <Link
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
    </>
  );
}
