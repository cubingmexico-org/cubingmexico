import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import type { NemesisSlot, NemesizedReport } from "../_lib/nemesis-queries";
import {
  CompareCell,
  PersonCells,
  ShowingCount,
  SlotEvent,
  formatSlotGap,
  formatSlotValue,
} from "./nemesis-cells";

function SlotComparisonCell({ slot }: { slot: NemesisSlot }) {
  const theirs = formatSlotValue(slot, slot.otherBest);
  const yours = formatSlotValue(slot, slot.targetBest);
  const gap = formatSlotGap(slot);

  return (
    <TableCell>
      <SlotEvent slot={slot} />
      <div className="text-sm">
        {theirs}
        <span className="text-muted-foreground">
          {" "}
          vs {yours ?? "sin resultado"}
          {gap && ` · ${gap}`}
        </span>
      </div>
    </TableCell>
  );
}

export function NemesizedList({
  targetWcaId,
  targetName,
  report,
}: {
  targetWcaId: string;
  targetName: string;
  report: NemesizedReport;
}) {
  const { victims, victimsTotal, almost, almostTotal } = report;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="text-center">
          <h2 className="font-semibold text-lg">
            Némesis de {victimsTotal} competidores
          </h2>
          <p className="text-muted-foreground">
            <span className="font-semibold">{targetName}</span> les supera en
            todos sus eventos.
          </p>
        </div>
        {victims.length === 0 ? (
          <p className="text-center text-muted-foreground">
            <span className="font-semibold">{targetName}</span> no es némesis de
            nadie.
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden sm:table-cell">Estado</TableHead>
                  <TableHead>Más cerca de escapar</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {victims.map((person) => (
                  <TableRow key={person.wcaId}>
                    <PersonCells person={person} />
                    <SlotComparisonCell slot={person.closest} />
                    <CompareCell
                      targetWcaId={targetWcaId}
                      wcaId={person.wcaId}
                    />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ShowingCount shown={victims.length} total={victimsTotal} />
          </>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="text-center">
          <h2 className="font-semibold text-lg">Casi eres su némesis</h2>
          <p className="text-muted-foreground">
            Les superas en todos sus eventos excepto uno.
          </p>
        </div>
        {almost.length === 0 ? (
          <p className="text-center text-muted-foreground">
            <span className="font-semibold">{targetName}</span> no está a un
            solo evento de ser némesis de nadie.
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden sm:table-cell">Estado</TableHead>
                  <TableHead>Evento donde no les superas</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {almost.map((person) => (
                  <TableRow key={person.wcaId}>
                    <PersonCells person={person} />
                    <SlotComparisonCell slot={person.missing} />
                    <CompareCell
                      targetWcaId={targetWcaId}
                      wcaId={person.wcaId}
                    />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ShowingCount shown={almost.length} total={almostTotal} />
          </>
        )}
      </section>
    </div>
  );
}
