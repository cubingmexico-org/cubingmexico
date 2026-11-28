import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import { DeprecatedEventsSwitch } from "@/components/deprecated-events-switch";
import { crossEventIds } from "@/lib/constants";
import { eventScopeFromDeprecated } from "@/lib/official-events";
import { deprecatedParser } from "@/lib/search-params";
import { groupHref } from "@/lib/groups";
import type { GroupKind } from "@workspace/db/schema";
import type { SearchParams } from "@/types";
import { createSearchParamsCache } from "nuqs/server";
import { getGroupInfo, getGroupKinch } from "../_lib/queries";
import { redirectIfSponsorHasNoRoster } from "../_lib/roster";

const searchParamsCache = createSearchParamsCache({
  deprecated: deprecatedParser,
});

export async function GroupKinch({
  groupId,
  kind,
  searchParams,
}: {
  groupId: string;
  kind: GroupKind;
  searchParams: SearchParams;
}) {
  await redirectIfSponsorHasNoRoster(groupId, kind);

  const info = await getGroupInfo(groupId);
  if (!info || info.kind !== kind) {
    return null;
  }

  const { deprecated } = searchParamsCache.parse(searchParams);
  const scope = eventScopeFromDeprecated(deprecated);
  const persons = await getGroupKinch(groupId, scope);
  const recordsHref = `${groupHref(kind, groupId)}/records`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">Kinch Ranks</h2>
          <p className="text-sm text-muted-foreground">
            Puntuación relativa a los{" "}
            <Link
              href={recordsHref}
              prefetch={false}
              className="text-brand hover:underline"
            >
              récords del grupo
            </Link>{" "}
            (0–100 por evento; promedio en Total).
          </p>
        </div>
        <DeprecatedEventsSwitch />
      </div>

      {persons.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aún no hay resultados de grupo para calcular Kinch.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Total</TableHead>
                {crossEventIds(scope).map((eventId) => (
                  <TableHead key={eventId}>
                    <span className={`cubing-icon event-${eventId}`} />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {persons.map((person, index) => (
                <TableRow key={person.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Link
                      prefetch={false}
                      className="text-link hover:text-link/80"
                      href={`/persons/${person.id}`}
                    >
                      {person.name}
                    </Link>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {(person.overall ?? 0).toFixed(2)}
                  </TableCell>
                  {person.events.map((event) => (
                    <TableCell
                      key={event.eventId}
                      className={cn(
                        event.ratio === 0 &&
                          "text-red-700 dark:text-red-400 font-semibold",
                        event.ratio === 100 &&
                          "text-green-800 dark:text-green-400 font-semibold",
                      )}
                    >
                      {(event.ratio ?? 0).toFixed(2)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
