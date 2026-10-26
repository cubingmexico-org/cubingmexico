import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { SrByEventTable } from "../../../../_components/sr-by-event-table";
import { AccentCell, Stat } from "../../../../_components/summary-stat";
import {
  EventNameCell,
  PersonLink,
} from "../../../../_components/summary-table-cells";
import type { TeamAnnualSummary } from "../_lib/queries";

export function TeamRecordsSection({
  records,
}: {
  records: TeamAnnualSummary["members"]["records"];
}) {
  const regionalRecordsTotal = records.wr + records.nar + records.nr;

  if (!(records.sr > 0 || regionalRecordsTotal > 0)) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Récords</h2>
      {records.sr > 0 && (
        <>
          <p className="text-muted-foreground text-sm sm:text-base">
            Se rompieron <Stat>{records.sr}</Stat> récords estatales (SR).
          </p>
          {records.byEventSr.length > 0 && (
            <SrByEventTable rows={records.byEventSr} />
          )}
          {records.topSrBreakers.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Persona</TableHead>
                    <TableHead className="text-center">SRs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.topSrBreakers.map((row) => (
                    <TableRow key={row.wcaId}>
                      <TableCell>
                        <PersonLink wcaId={row.wcaId} name={row.name} />
                      </TableCell>
                      <AccentCell>{row.count}</AccentCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
      {regionalRecordsTotal > 0 && (
        <>
          <p className="text-muted-foreground text-sm sm:text-base">
            También hubo <Stat>{records.wr}</Stat> WR,{" "}
            <Stat>{records.nar}</Stat> NAR y <Stat>{records.nr}</Stat> NR.
          </p>
          {records.regionalRecords.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Persona</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead className="text-center">Tipo</TableHead>
                    <TableHead className="text-center">Resultado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.regionalRecords.map((row, index) => (
                    <TableRow
                      key={`${row.wcaId}-${row.eventId}-${row.type}-${row.resultType}-${index}`}
                    >
                      <TableCell>
                        <PersonLink wcaId={row.wcaId} name={row.name} />
                      </TableCell>
                      <EventNameCell
                        eventId={row.eventId}
                        eventName={row.eventName}
                      />
                      <AccentCell>{row.type}</AccentCell>
                      <TableCell className="text-center">
                        {row.resultType}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
