import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import type { GroupKind } from "@workspace/db/schema";
import { StateLabel } from "@/components/state-flag";
import { getEvents } from "@/db/queries";
import { formatAttemptValue } from "@/lib/utils";
import { groupBasePath } from "@/lib/groups";
import { rankTypeForEvent } from "@/lib/selectors";
import { getGroupInfo, getGroupRanks } from "../_lib/queries";
import { redirectIfSponsorHasNoRoster } from "../_lib/roster";
import { GroupRankingsEventSelector } from "./group-rankings-event-selector";

export async function GroupRankings({
  groupId,
  kind,
  eventId,
  rankType,
}: {
  groupId: string;
  kind: GroupKind;
  eventId: string;
  rankType: "single" | "average";
}) {
  await redirectIfSponsorHasNoRoster(groupId, kind);

  const [info, events, ranks] = await Promise.all([
    getGroupInfo(groupId),
    getEvents(),
    getGroupRanks(groupId, eventId, rankType),
  ]);

  if (!info || info.kind !== kind) {
    return null;
  }

  const base = `${groupBasePath(kind)}/${groupId}/rankings`;
  const knownEvent = events.some((event) => event.id === eventId);
  if (!knownEvent) {
    redirect(`${base}/333/single`);
  }

  const validRankType = rankTypeForEvent(eventId, rankType);
  if (validRankType !== rankType) {
    redirect(`${base}/${eventId}/${validRankType}`);
  }

  return (
    <div className="space-y-4">
      <GroupRankingsEventSelector
        basePath={base}
        events={events}
        selectedEventId={eventId}
        selectedRankType={rankType}
      />

      {ranks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay rankings calculados todavía. Se actualizan tras importar
          resultados o editar el roster.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>NR</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Resultado</TableHead>
                <TableHead>Competencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranks.map((row) => (
                <TableRow key={row.personId}>
                  <TableCell>{row.groupRank}</TableCell>
                  <TableCell>
                    <div
                      className={cn(
                        "font-display text-lg font-bold tabular-nums tracking-wide",
                        row.countryRank <= 3 ? "text-brand" : "text-foreground",
                      )}
                    >
                      {row.countryRank}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/persons/${row.personId}`}
                      prefetch={false}
                      className="hover:underline"
                    >
                      {row.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {row.stateId && row.state ? (
                      <Link
                        href={`/teams/${row.stateId}`}
                        prefetch={false}
                        className="hover:underline"
                      >
                        <StateLabel
                          stateId={row.stateId}
                          stateName={row.state}
                        />
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatAttemptValue(eventId, row.best, rankType)}
                  </TableCell>
                  <TableCell>
                    {row.competitionId && row.competitionName ? (
                      <Link
                        href={`/competitions/${row.competitionId}`}
                        prefetch={false}
                        className="text-link hover:text-link/80"
                      >
                        {row.competitionName}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
