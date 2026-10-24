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
import type {
  PersonUnofficialHonors,
  PersonUnofficialPr,
} from "../_lib/queries";

/** Mirrors the official Medallas/Récords row, for unofficial events. */
export function UnofficialHonorsTables({
  honors,
}: {
  honors: PersonUnofficialHonors;
}) {
  const { medals, records } = honors;
  return (
    <div className="grid md:grid-cols-2 grid-cols-1 gap-4 mt-4">
      <div>
        <h3 className="text-center font-semibold mb-2">Medallas no oficiales</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Oro</TableHead>
              <TableHead className="text-center">Plata</TableHead>
              <TableHead className="text-center">Bronce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="text-center">{medals.gold}</TableCell>
              <TableCell className="text-center">{medals.silver}</TableCell>
              <TableCell className="text-center">{medals.bronze}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <div>
        <h3 className="text-center font-semibold mb-2">Récords no oficiales</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">UNR</TableHead>
              <TableHead className="text-center">USR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="text-center">{records.unr}</TableCell>
              <TableCell className="text-center">{records.usr}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function RankCell({ rank }: { rank: number | null | undefined }) {
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
  showStateRank,
}: {
  wcaId: string;
  prs: PersonUnofficialPr[];
  /** The person has a state, so USR columns apply. */
  showStateRank: boolean;
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
            {showStateRank && <TableHead className="text-center">USR</TableHead>}
            <TableHead className="text-center">UNR</TableHead>
            <TableHead className="text-center">Single</TableHead>
            <TableHead className="text-center">Average</TableHead>
            <TableHead className="text-center">UNR</TableHead>
            {showStateRank && <TableHead className="text-center">USR</TableHead>}
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
              {showStateRank && <RankCell rank={pr.single?.stateRank} />}
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
              {showStateRank && <RankCell rank={pr.average?.stateRank} />}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
