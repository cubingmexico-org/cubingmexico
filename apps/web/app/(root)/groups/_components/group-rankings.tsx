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
import type { GroupKind } from "@workspace/db/schema";
import { StateLabel } from "@/components/state-flag";
import { getEvents } from "@/db/queries";
import { formatAttemptValue } from "@/lib/utils";
import { groupBasePath } from "@/lib/groups";
import { rankTypeForEvent } from "@/lib/selectors";
import { getGroupInfo, getGroupRanks } from "../_lib/queries";
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
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranks.map((row) => (
                <TableRow key={row.personId}>
                  <TableCell>{row.groupRank}</TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
