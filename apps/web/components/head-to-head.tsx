import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import { DirectMatchupRounds } from "@/components/head-to-head-rounds";
import {
  summarizeHeadToHead,
  WINNER_CLASS,
  type HeadToHeadRound,
} from "@/lib/head-to-head";

export { WINNER_CLASS };

export type Side = "a" | "b";

export function betterSide(
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

export type SummaryRow = { label: string; a: number; b: number };

export function SummaryComparisonTable({
  aName,
  bName,
  rows,
}: {
  aName: string;
  bName: string;
  rows: SummaryRow[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-center w-1/3">{aName}</TableHead>
          <TableHead className="text-center w-1/3" />
          <TableHead className="text-center w-1/3">{bName}</TableHead>
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

export function DirectMatchups({
  aName,
  bName,
  rounds,
  emptyMessage,
  roundLimit,
}: {
  aName: string;
  bName: string;
  rounds: HeadToHeadRound[];
  emptyMessage: string;
  /** Max rows in the round list; the tally always counts every round. */
  roundLimit?: number;
}) {
  if (rounds.length === 0) {
    return <p className="text-center text-muted-foreground">{emptyMessage}</p>;
  }

  const summary = summarizeHeadToHead(rounds);
  const listedRounds =
    roundLimit != null ? rounds.slice(0, roundLimit) : rounds;

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
          <div className="text-sm text-muted-foreground truncate">{aName}</div>
        </div>
        <div className="text-sm text-muted-foreground">
          {summary.total} rondas
          {summary.ties > 0 && (
            <div>
              {summary.ties} empate{summary.ties === 1 ? "" : "s"}
            </div>
          )}
          {summary.noResult > 0 && <div>{summary.noResult} sin resultado</div>}
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
          <div className="text-sm text-muted-foreground truncate">{bName}</div>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Evento</TableHead>
            <TableHead className="text-center">{aName}</TableHead>
            <TableHead className="text-center">Empates</TableHead>
            <TableHead className="text-center">{bName}</TableHead>
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

      {listedRounds.length < rounds.length && (
        <p className="text-center text-sm text-muted-foreground -mb-2">
          Se listan las {listedRounds.length} rondas más recientes de{" "}
          {rounds.length}.
        </p>
      )}
      <DirectMatchupRounds aName={aName} bName={bName} rounds={listedRounds} />
    </div>
  );
}
