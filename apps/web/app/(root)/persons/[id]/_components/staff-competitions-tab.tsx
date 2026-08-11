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
import type { PersonStaffCompetition } from "../_lib/queries";
import { StateLabel } from "@/components/state-flag";

type PersonStaffCompetitionsTabProps = {
  organized: PersonStaffCompetition[];
  delegated: PersonStaffCompetition[];
};

function StaffCompetitionTable({
  competitions,
  emptyMessage,
}: {
  competitions: PersonStaffCompetition[];
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
            <TableHead>Fecha</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {competitions.map((competition) => (
            <TableRow key={competition.id}>
              <TableCell className="whitespace-nowrap">
                {formatDate(competition.startDate, competition.endDate)}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    className="font-medium hover:underline"
                    href={`/competitions/${competition.id}`}
                  >
                    {competition.name}
                  </Link>
                  {competition.cancelled && (
                    <Badge variant="secondary">Cancelada</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {competition.stateName ? (
                  <StateLabel
                    stateId={competition.stateId}
                    stateName={competition.stateName}
                  />
                ) : (
                  <span className="text-muted-foreground font-thin">N/A</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function PersonStaffCompetitionsTab({
  organized,
  delegated,
}: PersonStaffCompetitionsTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Organizadas
            <Badge variant="secondary">{organized.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StaffCompetitionTable
            competitions={organized}
            emptyMessage="Esta persona no ha organizado competencias."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Delegadas
            <Badge variant="secondary">{delegated.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StaffCompetitionTable
            competitions={delegated}
            emptyMessage="Esta persona no ha delegado competencias."
          />
        </CardContent>
      </Card>
    </div>
  );
}
