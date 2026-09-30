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
import { formatAttemptValue } from "@/lib/utils";
import {
  getAverageNationalRecords,
  getSingleNationalRecords,
  getTeamCompetitions,
  getTeamInfo,
  getTeamMedals,
  getTotalMembers,
} from "../../[stateId]/_lib/queries";
import {
  getTeamBestRecords,
  getTeamHeadToHeadResults,
  type TeamBestRecord,
  type TeamBestRecords,
} from "../_lib/queries";

const ROUND_LIST_LIMIT = 100;

async function getTeamCompareData(stateId: string) {
  const [
    info,
    members,
    competitions,
    medals,
    singleNRs,
    averageNRs,
    bestRecords,
  ] = await Promise.all([
    getTeamInfo(stateId),
    getTotalMembers(stateId),
    getTeamCompetitions(stateId),
    getTeamMedals(stateId),
    getSingleNationalRecords(stateId),
    getAverageNationalRecords(stateId),
    getTeamBestRecords(stateId),
  ]);

  if (!info) return null;

  return {
    stateId,
    info,
    members,
    competitionCount: competitions.length,
    medals,
    nationalRecords: singleNRs.length + averageNRs.length,
    bestRecords,
  };
}

type TeamData = NonNullable<Awaited<ReturnType<typeof getTeamCompareData>>>;

function stateRecordCount(records: TeamBestRecords) {
  return Object.values(records).reduce(
    (total, entry) => total + (entry.single ? 1 : 0) + (entry.average ? 1 : 0),
    0,
  );
}

function TeamHeader({ data }: { data: TeamData }) {
  const { info, stateId } = data;

  return (
    <div className="flex flex-col items-center gap-2 text-center min-w-0">
      <Avatar className="size-24 md:size-32 rounded">
        <AvatarImage
          src={info.image ?? undefined}
          alt={info.name}
          className="object-cover"
        />
        <AvatarFallback className="rounded text-2xl">
          {info.name
            .split(" ")
            .map((word) => word[0])
            .join("")}
        </AvatarFallback>
      </Avatar>
      <Link
        href={`/teams/${stateId}`}
        className="font-semibold text-lg text-link hover:text-link/80 wrap-break-word"
      >
        {info.name}
      </Link>
      <StateLabel
        stateId={stateId}
        stateName={info.state}
        className="justify-center text-sm text-muted-foreground"
      />
    </div>
  );
}

function SummaryTable({ a, b }: { a: TeamData; b: TeamData }) {
  return (
    <SummaryComparisonTable
      aName={a.info.name}
      bName={b.info.name}
      rows={[
        { label: "Miembros", a: a.members, b: b.members },
        {
          label: "Competencias organizadas",
          a: a.competitionCount,
          b: b.competitionCount,
        },
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
          label: "SR",
          a: stateRecordCount(a.bestRecords),
          b: stateRecordCount(b.bestRecords),
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
  record: TeamBestRecord | undefined;
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
  a: TeamData;
  b: TeamData;
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
          <TableHead className="text-center">{a.info.name}</TableHead>
          <TableHead className="text-center">{b.info.name}</TableHead>
          <TableHead className="text-center">{a.info.name}</TableHead>
          <TableHead className="text-center">{b.info.name}</TableHead>
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

export async function TeamCompareContent({ a, b }: { a: string; b: string }) {
  "use cache";
  cacheLife("days");
  cacheTag(`team-compare-${a}`, `team-compare-${b}`);

  const [events, aData, bData, rounds] = await Promise.all([
    getEvents(),
    getTeamCompareData(a),
    getTeamCompareData(b),
    getTeamHeadToHeadResults(a, b),
  ]);

  if (!aData || !bData) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-4">
        <TeamHeader data={aData} />
        <span className="self-center text-2xl font-bold text-muted-foreground">
          vs
        </span>
        <TeamHeader data={bData} />
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
          En cada ronda compartida gana el team cuyo mejor integrante quedó en
          mejor posición.
        </p>
        <DirectMatchups
          aName={aData.info.name}
          bName={bData.info.name}
          rounds={rounds}
          roundLimit={ROUND_LIST_LIMIT}
          emptyMessage="Estos teams nunca han competido en la misma ronda."
        />
      </section>
    </div>
  );
}
