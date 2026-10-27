import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import type { AnnualSummary } from "../[year]/[wcaId]/_lib/queries";
import type { TeamAnnualSummary } from "../team/[year]/[stateId]/_lib/queries";
import { AccentCell } from "./summary-stat";

export function KinchSorSection({
  description,
  beforeLabel,
  year,
  kinchSor,
}: {
  description: ReactNode;
  beforeLabel: ReactNode;
  year: number;
  kinchSor:
    | AnnualSummary["kinchSor"]
    | TeamAnnualSummary["members"]["kinchSor"];
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Kinch y Sum of Ranks</h2>
      <p className="text-muted-foreground text-sm sm:text-base">
        {description}
      </p>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Métrica</TableHead>
              <TableHead className="text-center">{beforeLabel}</TableHead>
              <TableHead className="text-center">{year}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Kinch overall</TableCell>
              <TableCell className="text-center">
                {kinchSor.kinchBefore.toFixed(2)}
              </TableCell>
              <AccentCell>{kinchSor.kinchAfter.toFixed(2)}</AccentCell>
            </TableRow>
            <TableRow>
              <TableCell>Sum of Ranks (single)</TableCell>
              <TableCell className="text-center">
                {kinchSor.sorSingleBefore}
              </TableCell>
              <AccentCell>{kinchSor.sorSingleAfter}</AccentCell>
            </TableRow>
            <TableRow>
              <TableCell>Sum of Ranks (average)</TableCell>
              <TableCell className="text-center">
                {kinchSor.sorAverageBefore}
              </TableCell>
              <AccentCell>{kinchSor.sorAverageAfter}</AccentCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
