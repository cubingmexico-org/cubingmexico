import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Badge } from "@workspace/ui/components/badge";
import { formatDate } from "@/lib/utils";
import type {
  PersonPrStreakCompetition,
  PersonPrStreaks,
} from "../_lib/queries";

type Props = {
  streaks: PersonPrStreaks;
};

function StreakCompetitionTable({
  competitions,
  emptyMessage,
}: {
  competitions: PersonPrStreakCompetition[];
  emptyMessage: string;
}) {
  if (competitions.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Competencia</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {competitions.map((competition, index) => (
            <TableRow key={`${competition.competitionId}-${index}`}>
              <TableCell className="text-muted-foreground">
                {index + 1}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {formatDate(competition.startDate, competition.endDate)}
              </TableCell>
              <TableCell>
                <Link
                  className="font-medium text-link hover:text-link/80"
                  href={`/competitions/${competition.competitionId}`}
                >
                  {competition.competitionName}
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function PersonPrStreaksTab({ streaks }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle>Racha actual</CardTitle>
          <Badge variant="secondary">{streaks.currentStreak.length}</Badge>
        </CardHeader>
        <CardContent>
          <StreakCompetitionTable
            competitions={streaks.currentStreak}
            emptyMessage="No hay una racha de récords personales activa."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle>Racha más larga</CardTitle>
          <Badge variant="secondary">{streaks.longestStreak.length}</Badge>
        </CardHeader>
        <CardContent>
          <StreakCompetitionTable
            competitions={streaks.longestStreak}
            emptyMessage="Esta persona aún no tiene rachas de récords personales."
          />
        </CardContent>
      </Card>
    </div>
  );
}
