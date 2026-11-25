import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import Link from "next/link";
import { StateSelector } from "./_components/state-selector";
import { getStates } from "@/db/queries";
import type { Metadata } from "next";
import { getTeam } from "@/db/queries";
import { getKinchRanksState } from "./_lib/queries";
import { crossEventIds } from "@/lib/constants";
import { DeprecatedEventsSwitch } from "@/components/deprecated-events-switch";
import { eventScopeFromDeprecated } from "@/lib/official-events";
import { deprecatedParser } from "@/lib/search-params";
import { createSearchParamsCache } from "nuqs/server";
import type { SearchParams } from "@/types";

const searchParamsCache = createSearchParamsCache({
  deprecated: deprecatedParser,
});

type Props = {
  params: Promise<{ stateId: string }>;
};

export async function generateStaticParams() {
  const states = await getStates();
  return states.map((state) => ({ stateId: state.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const stateId = (await params).stateId;

  const team = await getTeam(stateId);

  return {
    title: `Kinch Ranks de ${team?.state} | Cubing México`,
    description: `Kinch Ranks de ${team?.state}: puntuación 0–100 por evento frente al récord estatal.`,
  };
}

export default async function Page(props: {
  params: Promise<{ stateId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const stateId = (await props.params).stateId;
  const { deprecated } = searchParamsCache.parse(await props.searchParams);
  const scope = eventScopeFromDeprecated(deprecated);

  const persons = await getKinchRanksState(stateId, scope);

  const states = await getStates();

  const stateName = states.find((state) => state.id === stateId)?.name;

  return (
    <>
      <div className="flex flex-col gap-4 mb-6">
        <h1 className="text-3xl font-bold">
          Kinch Ranks estatales de {stateName}
        </h1>
        <p>
          Misma idea que el Kinch nacional, pero frente a los{" "}
          <Link
            className="text-muted-foreground hover:underline"
            href={`/records/${stateId}`}
            prefetch={false}
          >
            récords estatales (SR)
          </Link>
          : cada evento vale de 0 a 100 según qué tan cerca está tu PR. El total
          promedia todos los eventos y equilibra mejor que el{" "}
          <Link
            className="text-muted-foreground hover:underline"
            href="/sor/single"
          >
            Sum of Ranks
          </Link>
          .
        </p>
        <StateSelector states={states} stateName={stateName!} />
        <DeprecatedEventsSwitch />
      </div>
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
    </>
  );
}
