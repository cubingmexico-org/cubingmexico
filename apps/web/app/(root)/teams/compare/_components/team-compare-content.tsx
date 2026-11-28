import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import { StateLabel } from "@/components/state-flag";
import {
  betterSide,
  DirectMatchups,
  SummaryComparisonTable,
  WINNER_CLASS,
} from "@/components/head-to-head";
import { getEvents } from "@/db/queries";
import type { EventScope } from "@/lib/constants";
import {
  collectiveKindLabel,
  collectiveRefKey,
  type CollectiveRef,
} from "@/lib/collective-compare";
import { formatGroupLocationLine, groupHref } from "@/lib/groups";
import { formatAttemptValue } from "@/lib/utils";
import {
  getGroupInfo,
  getGroupMedals,
  getGroupTotalMembers,
} from "@/app/(root)/groups/_lib/queries";
import {
  getTeamCompetitions,
  getTeamInfo,
  getTeamMedals,
  getTotalMembers,
} from "../../[stateId]/_lib/queries";
import {
  getCollectiveBestRecords,
  getCollectiveHeadToHeadResults,
  getCollectiveNationalRecordCount,
  type CollectiveBestRecord,
  type CollectiveBestRecords,
} from "../_lib/queries";

const ROUND_LIST_LIMIT = 100;

type CollectiveCompareData = {
  ref: CollectiveRef;
  name: string;
  image: string | null;
  href: string;
  subtitle: string | null;
  stateId: string | null;
  stateName: string | null;
  members: number;
  competitionCount: number | null;
  medals: { gold: number; silver: number; bronze: number };
  nationalRecords: number;
  bestRecords: CollectiveBestRecords;
};

async function getCollectiveCompareData(
  ref: CollectiveRef,
  scope: EventScope,
): Promise<CollectiveCompareData | null> {
  if (ref.kind === "team") {
    const [info, members, competitions, medals, nationalRecords, bestRecords] =
      await Promise.all([
        getTeamInfo(ref.id),
        getTotalMembers(ref.id),
        getTeamCompetitions(ref.id),
        getTeamMedals(ref.id),
        getCollectiveNationalRecordCount(ref, scope),
        getCollectiveBestRecords(ref, scope),
      ]);
    if (!info) return null;
    return {
      ref,
      name: info.name,
      image: info.image,
      href: `/teams/${ref.id}`,
      subtitle: info.state,
      stateId: ref.id,
      stateName: info.state,
      members,
      competitionCount: competitions.length,
      medals,
      nationalRecords,
      bestRecords,
    };
  }

  const [info, members, medals, nationalRecords, bestRecords] =
    await Promise.all([
      getGroupInfo(ref.id),
      getGroupTotalMembers(ref.id),
      getGroupMedals(ref.id),
      getCollectiveNationalRecordCount(ref, scope),
      getCollectiveBestRecords(ref, scope),
    ]);

  if (!info || info.kind !== ref.kind) return null;

  const location = formatGroupLocationLine({
    kind: info.kind,
    regionLabel: info.regionLabel,
    city: info.city,
    stateName: info.stateName,
  });

  return {
    ref,
    name: info.name,
    image: info.image,
    href: groupHref(info.kind, info.id),
    subtitle: location ?? collectiveKindLabel(ref.kind),
    stateId: null,
    stateName: null,
    members,
    competitionCount: null,
    medals,
    nationalRecords,
    bestRecords,
  };
}

function bestMarkCount(records: CollectiveBestRecords) {
  return Object.values(records).reduce(
    (total, entry) => total + (entry.single ? 1 : 0) + (entry.average ? 1 : 0),
    0,
  );
}

function CollectiveHeader({ data }: { data: CollectiveCompareData }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center min-w-0">
      <Avatar className="size-24 md:size-32 rounded">
        <AvatarImage
          src={data.image ?? undefined}
          alt={data.name}
          className="object-cover"
        />
        <AvatarFallback className="rounded text-2xl">
          {data.name
            .split(" ")
            .map((word) => word[0])
            .join("")}
        </AvatarFallback>
      </Avatar>
      <Link
        href={data.href}
        prefetch={false}
        className="font-semibold text-lg text-link hover:text-link/80 wrap-break-word"
      >
        {data.name}
      </Link>
      {data.stateId && data.stateName ? (
        <StateLabel
          stateId={data.stateId}
          stateName={data.stateName}
          className="justify-center text-sm text-muted-foreground"
        />
      ) : data.subtitle ? (
        <p className="text-sm text-muted-foreground">{data.subtitle}</p>
      ) : null}
    </div>
  );
}

function SummaryTable({
  a,
  b,
}: {
  a: CollectiveCompareData;
  b: CollectiveCompareData;
}) {
  const bothTeams = a.ref.kind === "team" && b.ref.kind === "team";

  return (
    <SummaryComparisonTable
      aName={a.name}
      bName={b.name}
      rows={[
        { label: "Miembros", a: a.members, b: b.members },
        ...(bothTeams
          ? [
              {
                label: "Competencias organizadas",
                a: a.competitionCount ?? 0,
                b: b.competitionCount ?? 0,
              },
            ]
          : []),
        {
          label: "Eventos",
          a: Object.keys(a.bestRecords).length,
          b: Object.keys(b.bestRecords).length,
        },
        { label: "Oro", a: a.medals.gold, b: b.medals.gold },
        { label: "Plata", a: a.medals.silver, b: b.medals.silver },
        { label: "Bronce", a: a.medals.bronze, b: b.medals.bronze },
        { label: "NR", a: a.nationalRecords, b: b.nationalRecords },
        {
          label: "Mejores marcas",
          a: bestMarkCount(a.bestRecords),
          b: bestMarkCount(b.bestRecords),
        },
      ]}
    />
  );
}

function BestRecordCell({
  eventId,
  record,
  type,
  isWinner,
}: {
  eventId: string;
  record: CollectiveBestRecord | undefined;
  type: "single" | "average";
  isWinner: boolean;
}) {
  const formatted = record
    ? formatAttemptValue(eventId, record.best, type)
    : null;

  if (!record || !formatted) {
    return (
      <TableCell className="text-center">
        <span className="text-muted-foreground font-thin">-</span>
      </TableCell>
    );
  }

  return (
    <TableCell className="text-center">
      <div className={cn(isWinner && WINNER_CLASS)}>{formatted}</div>
      <Link
        href={`/persons/${record.personId}`}
        prefetch={false}
        className="text-xs text-muted-foreground hover:text-link"
      >
        {record.personName ?? record.personId}
      </Link>
    </TableCell>
  );
}

function BestRecordsTable({
  a,
  b,
  events,
}: {
  a: CollectiveCompareData;
  b: CollectiveCompareData;
  events: Array<{ id: string; name: string }>;
}) {
  const rows = events.filter(
    (event) => a.bestRecords[event.id] || b.bestRecords[event.id],
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead rowSpan={2}>Evento</TableHead>
          <TableHead colSpan={2} className="text-center">
            Single
          </TableHead>
          <TableHead colSpan={2} className="text-center">
            Average
          </TableHead>
        </TableRow>
        <TableRow>
          <TableHead className="text-center">{a.name}</TableHead>
          <TableHead className="text-center">{b.name}</TableHead>
          <TableHead className="text-center">{a.name}</TableHead>
          <TableHead className="text-center">{b.name}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((event) => {
          const aRecord = a.bestRecords[event.id];
          const bRecord = b.bestRecords[event.id];
          const singleWinner = betterSide(
            aRecord?.single?.best,
            bRecord?.single?.best,
            "lower",
          );
          const averageWinner = betterSide(
            aRecord?.average?.best,
            bRecord?.average?.best,
            "lower",
          );

          return (
            <TableRow key={event.id}>
              <TableCell>
                <span className={`cubing-icon event-${event.id}`} />
                <span className="ml-2 hidden md:inline">{event.name}</span>
              </TableCell>
              <BestRecordCell
                eventId={event.id}
                record={aRecord?.single}
                type="single"
                isWinner={singleWinner === "a"}
              />
              <BestRecordCell
                eventId={event.id}
                record={bRecord?.single}
                type="single"
                isWinner={singleWinner === "b"}
              />
              <BestRecordCell
                eventId={event.id}
                record={aRecord?.average}
                type="average"
                isWinner={averageWinner === "a"}
              />
              <BestRecordCell
                eventId={event.id}
                record={bRecord?.average}
                type="average"
                isWinner={averageWinner === "b"}
              />
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export async function TeamCompareContent({
  a,
  b,
  scope,
}: {
  a: CollectiveRef;
  b: CollectiveRef;
  scope: EventScope;
}) {
  "use cache";
  cacheLife("days");
  cacheTag(
    `collective-compare-${collectiveRefKey(a)}`,
    `collective-compare-${collectiveRefKey(b)}`,
  );

  const [events, aData, bData, rounds] = await Promise.all([
    getEvents(scope),
    getCollectiveCompareData(a, scope),
    getCollectiveCompareData(b, scope),
    getCollectiveHeadToHeadResults(a, b, scope),
  ]);

  if (!aData || !bData) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-4">
        <CollectiveHeader data={aData} />
        <span className="self-center text-2xl font-bold text-muted-foreground">
          vs
        </span>
        <CollectiveHeader data={bData} />
      </div>

      <section>
        <h2 className="text-center text-lg font-semibold mb-4">Resumen</h2>
        <SummaryTable a={aData} b={bData} />
      </section>

      <section>
        <h2 className="text-center text-lg font-semibold mb-4">
          Mejores marcas
        </h2>
        <BestRecordsTable a={aData} b={bData} events={events} />
      </section>

      <section>
        <h2 className="text-center text-lg font-semibold mb-2">
          Enfrentamientos directos
        </h2>
        <p className="text-center text-sm text-muted-foreground mb-4">
          En cada ronda compartida gana el colectivo cuyo mejor integrante quedó
          en mejor posición.
        </p>
        <DirectMatchups
          aName={aData.name}
          bName={bData.name}
          rounds={rounds}
          roundLimit={ROUND_LIST_LIMIT}
          emptyMessage="Estos colectivos nunca han competido en la misma ronda."
        />
      </section>
    </div>
  );
}
