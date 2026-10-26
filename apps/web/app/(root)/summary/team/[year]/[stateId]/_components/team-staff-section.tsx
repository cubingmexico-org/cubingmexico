import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Stat } from "../../../../_components/summary-stat";
import { PersonLink } from "../../../../_components/summary-table-cells";
import { formatSummaryDate } from "../../../../_lib/format";
import type { TeamAnnualSummary } from "../_lib/queries";
import { PersonCountTable } from "./person-count-table";

export function TeamStaffSection({
  year,
  staff,
}: {
  year: number;
  staff: TeamAnnualSummary["staff"];
}) {
  if (
    !(
      staff.newDelegates.length > 0 ||
      staff.hostedOrganizers.length > 0 ||
      staff.hostedDelegates.length > 0
    )
  ) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Organización</h2>
      {staff.newDelegates.length > 0 && (
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm sm:text-base">
            <Stat>{staff.newDelegates.length}</Stat>{" "}
            {staff.newDelegates.length === 1
              ? "persona delegó"
              : "personas delegaron"}{" "}
            por primera vez en {year}.
          </p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Persona</TableHead>
                  <TableHead>Primera competencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.newDelegates.map((row) => (
                  <TableRow key={row.wcaId}>
                    <TableCell>
                      <PersonLink wcaId={row.wcaId} name={row.name} />
                    </TableCell>
                    <TableCell>
                      <Link
                        prefetch={false}
                        href={`/competitions/${row.firstCompetitionId}`}
                        className="text-link hover:text-link/80"
                      >
                        {row.firstCompetitionName}
                      </Link>
                      <span className="text-muted-foreground text-xs block">
                        {formatSummaryDate(row.firstCompetitionDate)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      {staff.hostedOrganizers.length > 0 && (
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm sm:text-base">
            Organizadores del Team en competencias del estado:
          </p>
          <PersonCountTable rows={staff.hostedOrganizers} />
        </div>
      )}
      {staff.hostedDelegates.length > 0 && (
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm sm:text-base">
            Delegados del Team en competencias del estado:
          </p>
          <PersonCountTable rows={staff.hostedDelegates} />
        </div>
      )}
    </section>
  );
}
