import Image from "next/image";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";
import { StateLabel } from "@/components/state-flag";
import { getEvents } from "@/db/queries";
import { formatAttemptValue, roundTypeLabel } from "@/lib/utils";
import {
  getRoundWinner,
  summarizeHeadToHead,
  type HeadToHeadRound,
} from "@/lib/head-to-head";
import {
  getPersonAvatarFromWCA,
  getPersonData,
  type PersonalRecordWithStateRank,
} from "../../[id]/_lib/queries";
import { getHeadToHeadResults } from "../_lib/queries";

type PersonData = NonNullable<Awaited<ReturnType<typeof getPersonData>>>;
type WcaData = Awaited<ReturnType<typeof getPersonAvatarFromWCA>>;
type Side = "a" | "b";

const WINNER_CLASS = "font-semibold text-blue-700";

function betterSide(
  a: number | null | undefined,
  b: number | null | undefined,
  direction: "higher" | "lower",
): Side | null {
  const aValid = a != null && a > 0;
  const bValid = b != null && b > 0;
  if (!aValid && !bValid) return null;
  if (!bValid) return "a";
  if (!aValid) return "b";
  if (a === b) return null;
  if (direction === "higher") return a > b ? "a" : "b";
  return a < b ? "a" : "b";
}

function displayName(data: PersonData) {
  return data.person.name ?? data.person.wcaId;
}

function PersonHeader({
  data,
  wcaData,
}: {
  data: PersonData;
  wcaData: WcaData;
}) {
  const { person, team } = data;

  return (
    <div className="flex flex-col items-center gap-2 text-center min-w-0">
      {wcaData && (
        <Image
          src={wcaData.person.avatar.url}
          alt="Avatar"
          width={128}
          height={128}
          className="size-24 md:size-32 rounded object-cover"
        />
      )}
      <Link
        href={`/persons/${person.wcaId}`}
        className="font-semibold text-lg text-link hover:text-link/80 wrap-break-word"
      >
        {displayName(data)}
      </Link>
      <span className="text-sm text-muted-foreground">{person.wcaId}</span>
      {person.state && (
        <StateLabel stateName={person.state} className="justify-center" />
      )}
      {team && (
        <Badge variant="outline" asChild>
          <Link href={`/teams/${team.id}`} className="gap-1.5">
            {team.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={team.image}
                alt=""
                width={14}
                height={14}
                className="size-3.5 rounded-sm object-cover"
              />
            ) : null}
            {team.name}
          </Link>
        </Badge>
      )}
    </div>
  );
}

function SummaryTable({ a, b }: { a: PersonData; b: PersonData }) {
  const rows: Array<{ label: string; a: number; b: number }> = [
    { label: "Competencias", a: a.competitionCount, b: b.competitionCount },
    { label: "Solves", a: a.solveCount, b: b.solveCount },
    {
      label: "Eventos",
      a: Object.keys(a.personalRecords).length,
      b: Object.keys(b.personalRecords).length,
    },
    { label: "Oro", a: a.medals.gold, b: b.medals.gold },
    { label: "Plata", a: a.medals.silver, b: b.medals.silver },
    { label: "Bronce", a: a.medals.bronze, b: b.medals.bronze },
    { label: "WR", a: a.regionalRecords.world, b: b.regionalRecords.world },
    {
      label: "CR",
      a: a.regionalRecords.continental,
      b: b.regionalRecords.continental,
    },
    {
      label: "NR",
      a: a.regionalRecords.national,
      b: b.regionalRecords.national,
    },
    {
      label: "SR",
      a: a.regionalRecords.state ?? 0,
      b: b.regionalRecords.state ?? 0,
    },
  ];

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-center w-1/3">{displayName(a)}</TableHead>
          <TableHead className="text-center w-1/3" />
          <TableHead className="text-center w-1/3">{displayName(b)}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const winner = betterSide(row.a, row.b, "higher");
          return (
            <TableRow key={row.label}>
              <TableCell
                className={cn("text-center", winner === "a" && WINNER_CLASS)}
              >
                {row.a}
              </TableCell>
              <TableCell className="text-center text-muted-foreground">
                {row.label}
              </TableCell>
              <TableCell
                className={cn("text-center", winner === "b" && WINNER_CLASS)}
              >
                {row.b}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function RecordCell({
  eventId,
  record,
  type,
  isWinner,
}: {
  eventId: string;
  record: PersonalRecordWithStateRank | undefined;
  type: "single" | "average";
  isWinner: boolean;
}) {
  const entry = type === "single" ? record?.single : record?.average;
  const formatted = entry
    ? formatAttemptValue(eventId, entry.best, type)
    : null;

  if (!entry || !formatted) {
    return (
      <TableCell className="text-center">
        <span className="text-muted-foreground font-thin">-</span>
      </TableCell>
    );
  }

  return (
    <TableCell className="text-center">
      <div className={cn(isWinner && WINNER_CLASS)}>{formatted}</div>
      <div className="text-xs text-muted-foreground">
        {entry.countryRank ? `NR ${entry.countryRank}` : null}
        {entry.countryRank && entry.stateRank ? " · " : null}
        {entry.stateRank ? `SR ${entry.stateRank}` : null}
      </div>
    </TableCell>
  );
}

function PersonalRecordsTable({
  a,
  b,
  events,
}: {
  a: PersonData;
  b: PersonData;
  events: Array<{ id: string; name: string }>;
}) {
  const rows = events.filter(
    (event) => a.personalRecords[event.id] || b.personalRecords[event.id],
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
          <TableHead className="text-center">{displayName(a)}</TableHead>
          <TableHead className="text-center">{displayName(b)}</TableHead>
          <TableHead className="text-center">{displayName(a)}</TableHead>
          <TableHead className="text-center">{displayName(b)}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((event) => {
          const aRecord = a.personalRecords[event.id];
          const bRecord = b.personalRecords[event.id];
          const singleWinner = betterSide(
            aRecord?.single.best,
            bRecord?.single.best,
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
              <RecordCell
                eventId={event.id}
                record={aRecord}
                type="single"
                isWinner={singleWinner === "a"}
              />
              <RecordCell
                eventId={event.id}
                record={bRecord}
                type="single"
                isWinner={singleWinner === "b"}
              />
              <RecordCell
                eventId={event.id}
                record={aRecord}
                type="average"
                isWinner={averageWinner === "a"}
              />
              <RecordCell
                eventId={event.id}
                record={bRecord}
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

function RoundResult({
  eventId,
  side,
  isWinner,
}: {
  eventId: string;
  side: HeadToHeadRound["a"];
  isWinner: boolean;
}) {
  const single = formatAttemptValue(eventId, side.best, "single");
  const average = formatAttemptValue(eventId, side.average, "average");

  return (
    <TableCell className="text-center">
      <div className={cn(isWinner && WINNER_CLASS)}>
        {side.pos ? `#${side.pos}` : "-"}
      </div>
      <div className="text-xs text-muted-foreground">
        {[single, average].filter(Boolean).join(" / ")}
      </div>
    </TableCell>
  );
}

function DirectMatchups({
  a,
  b,
  rounds,
}: {
  a: PersonData;
  b: PersonData;
  rounds: HeadToHeadRound[];
}) {
  if (rounds.length === 0) {
    return (
      <p className="text-center text-muted-foreground">
        Nunca han competido en la misma ronda.
      </p>
    );
  }

  const summary = summarizeHeadToHead(rounds);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-center">
        <div>
          <div
            className={cn(
              "text-5xl font-bold",
              summary.aWins > summary.bWins && "text-blue-700",
            )}
          >
            {summary.aWins}
          </div>
          <div className="text-sm text-muted-foreground truncate">
            {displayName(a)}
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {summary.total} rondas
          {summary.ties > 0 && (
            <div>
              {summary.ties} empate{summary.ties === 1 ? "" : "s"}
            </div>
          )}
        </div>
        <div>
          <div
            className={cn(
              "text-5xl font-bold",
              summary.bWins > summary.aWins && "text-blue-700",
            )}
          >
            {summary.bWins}
          </div>
          <div className="text-sm text-muted-foreground truncate">
            {displayName(b)}
          </div>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Evento</TableHead>
            <TableHead className="text-center">{displayName(a)}</TableHead>
            <TableHead className="text-center">Empates</TableHead>
            <TableHead className="text-center">{displayName(b)}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {summary.byEvent.map((event) => (
            <TableRow key={event.eventId}>
              <TableCell>
                <span className={`cubing-icon event-${event.eventId}`} />
                <span className="ml-2 hidden md:inline">{event.eventName}</span>
              </TableCell>
              <TableCell
                className={cn(
                  "text-center",
                  event.aWins > event.bWins && WINNER_CLASS,
                )}
              >
                {event.aWins}
              </TableCell>
              <TableCell className="text-center text-muted-foreground">
                {event.ties}
              </TableCell>
              <TableCell
                className={cn(
                  "text-center",
                  event.bWins > event.aWins && WINNER_CLASS,
                )}
              >
                {event.bWins}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Competencia</TableHead>
            <TableHead>Evento</TableHead>
            <TableHead className="text-center">{displayName(a)}</TableHead>
            <TableHead className="text-center">{displayName(b)}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rounds.map((round) => {
            const winner = getRoundWinner(round);
            return (
              <TableRow
                key={`${round.competitionId}-${round.eventId}-${round.roundTypeId}`}
              >
                <TableCell>
                  <Link
                    href={`/competitions/${round.competitionId}`}
                    className="text-link hover:text-link/80"
                  >
                    {round.competitionName}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {round.date}
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`cubing-icon event-${round.eventId}`} />
                  <span className="ml-2 text-sm">
                    {roundTypeLabel(round.roundTypeId)}
                  </span>
                </TableCell>
                <RoundResult
                  eventId={round.eventId}
                  side={round.a}
                  isWinner={winner === "a"}
                />
                <RoundResult
                  eventId={round.eventId}
                  side={round.b}
                  isWinner={winner === "b"}
                />
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export async function CompareContent({ a, b }: { a: string; b: string }) {
  "use cache";
  cacheLife("days");
  cacheTag(`person-page-${a}`, `person-page-${b}`);

  const [events, aData, bData, aWca, bWca, rounds] = await Promise.all([
    getEvents(),
    getPersonData(a),
    getPersonData(b),
    getPersonAvatarFromWCA(a),
    getPersonAvatarFromWCA(b),
    getHeadToHeadResults(a, b),
  ]);

  if (!aData || !bData) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-4">
        <PersonHeader data={aData} wcaData={aWca} />
        <span className="self-center text-2xl font-bold text-muted-foreground">
          vs
        </span>
        <PersonHeader data={bData} wcaData={bWca} />
      </div>

      <section>
        <h2 className="text-center text-lg font-semibold mb-4">Resumen</h2>
        <SummaryTable a={aData} b={bData} />
      </section>

      <section>
        <h2 className="text-center text-lg font-semibold mb-4">
          Récords personales
        </h2>
        <PersonalRecordsTable a={aData} b={bData} events={events} />
      </section>

      <section>
        <h2 className="text-center text-lg font-semibold mb-4">
          Enfrentamientos directos
        </h2>
        <DirectMatchups a={aData} b={bData} rounds={rounds} />
      </section>
    </div>
  );
}
