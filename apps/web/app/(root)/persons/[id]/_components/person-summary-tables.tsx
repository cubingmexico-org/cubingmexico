import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

function CountsTable({
  title,
  counts,
}: {
  title: string;
  counts: { label: string; value: number }[];
}) {
  return (
    <div>
      <h3 className="text-center font-semibold mb-2">{title}</h3>
      <Table>
        <TableHeader>
          <TableRow>
            {counts.map((count) => (
              <TableHead key={count.label} className="text-center">
                {count.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            {counts.map((count) => (
              <TableCell key={count.label} className="text-center">
                {count.value}
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

export function PersonSummaryTables({
  medals,
  regionalRecords,
}: {
  medals: { gold: number; silver: number; bronze: number };
  regionalRecords: {
    world: number;
    continental: number;
    national: number;
    state?: number | null;
  };
}) {
  return (
    <div className="grid md:grid-cols-2 grid-cols-1 gap-4 mt-6">
      <CountsTable
        title="Medallas"
        counts={[
          { label: "Oro", value: medals.gold },
          { label: "Plata", value: medals.silver },
          { label: "Bronce", value: medals.bronze },
        ]}
      />
      <CountsTable
        title="Récords"
        counts={[
          { label: "WR", value: regionalRecords.world },
          { label: "CR", value: regionalRecords.continental },
          { label: "NR", value: regionalRecords.national },
          { label: "SR", value: regionalRecords.state ?? 0 },
        ]}
      />
    </div>
  );
}
