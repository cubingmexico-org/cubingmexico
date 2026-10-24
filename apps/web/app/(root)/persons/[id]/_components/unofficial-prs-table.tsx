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
import { formatCcResult } from "@/lib/cubing-contests";
import { CcEventIcon } from "@/components/cubing-contests/cc-event-icon";
import type { PersonUnofficialPr } from "../_lib/queries";

function RankCell({ rank }: { rank: number | undefined }) {
  return (
    <TableCell
      className={cn("text-center", rank === 1 && "font-semibold text-blue-700")}
    >
      {rank ?? <span className="text-muted-foreground font-thin">N/A</span>}
    </TableCell>
  );
}

export function UnofficialPrsTable({
  wcaId,
  prs,
}: {
  wcaId: string;
  prs: PersonUnofficialPr[];
}) {
  return (
    <section className="mt-6">
      <h2 className="text-center text-lg font-semibold">
        Récords personales no oficiales
      </h2>
      <p className="text-center text-xs text-muted-foreground mb-4">
        Eventos no oficiales en competencias WCA, según Cubing Contests.{" "}
        <Link
          prefetch={false}
          href={`/persons/${wcaId}?tab=unofficial`}
          className="text-link hover:text-link/80"
        >
          Ver resultados
        </Link>
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Evento</TableHead>
            <TableHead className="text-center">NR</TableHead>
            <TableHead className="text-center">Single</TableHead>
            <TableHead className="text-center">Average</TableHead>
            <TableHead className="text-center">NR</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {prs.map((pr) => (
            <TableRow key={pr.eventId}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <CcEventIcon eventId={pr.eventId} eventName={pr.eventName} />
                  <span>{pr.eventName}</span>
                </div>
              </TableCell>
              <RankCell rank={pr.single?.countryRank} />
              <TableCell className="text-center font-semibold">
                {pr.single
                  ? formatCcResult(pr.eventFormat, pr.single.value)
                  : null}
              </TableCell>
              <TableCell className="text-center font-semibold">
                {pr.average
                  ? formatCcResult(pr.eventFormat, pr.average.value, "average")
                  : null}
              </TableCell>
              <RankCell rank={pr.average?.countryRank} />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
