"use client";

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
import { LoadMoreButton, useLoadMore } from "@/components/load-more";
import { formatAttemptValue, roundTypeLabel } from "@/lib/utils";
import {
  getRoundWinner,
  WINNER_CLASS,
  type HeadToHeadRound,
  type HeadToHeadSide,
} from "@/lib/head-to-head";

function RoundResult({
  eventId,
  side,
  isWinner,
}: {
  eventId: string;
  side: HeadToHeadSide;
  isWinner: boolean;
}) {
  const single = formatAttemptValue(eventId, side.best, "single");
  const average = formatAttemptValue(eventId, side.average, "average");

  return (
    <TableCell className="text-center">
      <div className={cn(isWinner && WINNER_CLASS)}>
        {side.pos ? `#${side.pos}` : "-"}
      </div>
      {side.personId && (
        <Link
          href={`/persons/${side.personId}`}
          className="block text-xs text-link hover:text-link/80 truncate"
        >
          {side.personName ?? side.personId}
        </Link>
      )}
      <div className="text-xs text-muted-foreground">
        {[single, average].filter(Boolean).join(" / ")}
      </div>
    </TableCell>
  );
}

export function DirectMatchupRounds({
  aName,
  bName,
  rounds,
}: {
  aName: string;
  bName: string;
  rounds: HeadToHeadRound[];
}) {
  const { visible, loadMore } = useLoadMore(rounds);

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Competencia</TableHead>
            <TableHead>Evento</TableHead>
            <TableHead className="text-center">{aName}</TableHead>
            <TableHead className="text-center">{bName}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((round) => {
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
      <LoadMoreButton
        onClick={loadMore}
        shown={visible.length}
        total={rounds.length}
      />
    </div>
  );
}
