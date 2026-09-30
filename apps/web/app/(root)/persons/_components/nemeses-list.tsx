import Link from "next/link";
import { Swords } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { StateLabel } from "@/components/state-flag";
import type { PersonNemesis } from "../_lib/nemesis-queries";

export function NemesesList({
  targetWcaId,
  targetName,
  nemeses,
}: {
  targetWcaId: string;
  targetName: string;
  nemeses: PersonNemesis[];
}) {
  if (nemeses.length === 0) {
    return (
      <p className="text-center py-6">
        <span className="font-semibold">{targetName}</span> no tiene némesis.
        Nadie en México le supera en todos sus eventos.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center">
        <span className="font-semibold">{targetName}</span> tiene{" "}
        <span className="font-semibold">{nemeses.length}</span> némesis
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead className="hidden sm:table-cell">WCA ID</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {nemeses.map((nemesis) => (
            <TableRow key={nemesis.wcaId}>
              <TableCell>
                <Link
                  href={`/persons/${nemesis.wcaId}`}
                  className="text-link hover:text-link/80"
                >
                  {nemesis.name ?? nemesis.wcaId}
                </Link>
              </TableCell>
              <TableCell className="hidden sm:table-cell text-muted-foreground">
                {nemesis.wcaId}
              </TableCell>
              <TableCell>
                {nemesis.stateName ? (
                  <StateLabel
                    stateId={nemesis.stateId}
                    stateName={nemesis.stateName}
                  />
                ) : (
                  <span className="text-muted-foreground font-thin">N/A</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/persons/compare?a=${targetWcaId}&b=${nemesis.wcaId}`}
                  >
                    <Swords className="size-4" />
                    Comparar
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
