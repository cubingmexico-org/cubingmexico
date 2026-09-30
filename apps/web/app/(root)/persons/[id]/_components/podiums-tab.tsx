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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import type { PersonPodiumsByEvent } from "../_lib/queries";

type Props = {
  podiums: PersonPodiumsByEvent[];
};

const GOLD_CLASS = "text-amber-600 font-bold";
const SILVER_CLASS = "text-slate-500 font-bold";
const BRONZE_CLASS = "text-yellow-700 font-bold";

function MedalCell({ value, className }: { value: number; className: string }) {
  return (
    <TableCell className={cn("text-center", value > 0 && className)}>
      {value > 0 ? value : null}
    </TableCell>
  );
}

export function PersonPodiumsTab({ podiums }: Props) {
  if (podiums.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Podios por evento</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Esta persona no tiene resultados registrados.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totals = podiums.reduce(
    (acc, row) => ({
      gold: acc.gold + row.gold,
      silver: acc.silver + row.silver,
      bronze: acc.bronze + row.bronze,
      total: acc.total + row.total,
    }),
    { gold: 0, silver: 0, bronze: 0, total: 0 },
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Podios por evento</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center w-12">No.</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-center">Oro</TableHead>
                <TableHead className="text-center">Plata</TableHead>
                <TableHead className="text-center">Bronce</TableHead>
                <TableHead className="text-center">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {podiums.map((row, index) => (
                <TableRow key={row.eventId}>
                  <TableCell className="text-center">{index + 1}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className={`cubing-icon event-${row.eventId} mr-2`} />
                    {row.eventName}
                  </TableCell>
                  <MedalCell value={row.gold} className={GOLD_CLASS} />
                  <MedalCell value={row.silver} className={SILVER_CLASS} />
                  <MedalCell value={row.bronze} className={BRONZE_CLASS} />
                  <TableCell className="text-center font-semibold">
                    {row.total}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell />
                <TableCell className="font-semibold">TOTAL</TableCell>
                <TableCell className={cn("text-center", GOLD_CLASS)}>
                  {totals.gold}
                </TableCell>
                <TableCell className={cn("text-center", SILVER_CLASS)}>
                  {totals.silver}
                </TableCell>
                <TableCell className={cn("text-center", BRONZE_CLASS)}>
                  {totals.bronze}
                </TableCell>
                <TableCell className="text-center font-bold">
                  {totals.total}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
