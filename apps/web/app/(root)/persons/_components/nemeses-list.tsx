"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { LoadMoreButton, useLoadMore } from "@/components/load-more";
import type { NemesisReport, NemesisSlot } from "../_lib/nemesis-queries";
import {
  CompareCell,
  PersonCells,
  ShowingCount,
  SlotEvent,
  formatSlotGap,
  formatSlotValue,
} from "./nemesis-cells";

function ClosestSlotCell({ slot }: { slot: NemesisSlot }) {
  const target = formatSlotValue(slot, slot.otherBest);
  const gap = formatSlotGap(slot);

  return (
    <TableCell>
      <SlotEvent slot={slot} />
      <div className="text-sm">
        {target}
        {gap && <span className="text-muted-foreground"> · {gap}</span>}
      </div>
    </TableCell>
  );
}

function MissingSlotCell({ slot }: { slot: NemesisSlot }) {
  const theirs = formatSlotValue(slot, slot.otherBest);
  const yours = formatSlotValue(slot, slot.targetBest);
  const gap = formatSlotGap(slot);

  return (
    <TableCell>
      <SlotEvent slot={slot} />
      <div className="text-sm">
        {theirs ? (
          <>
            {theirs}
            <span className="text-muted-foreground">
              {" "}
              vs {yours}
              {gap && ` · ${gap}`}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">
            Sin resultado · tú {yours}
          </span>
        )}
      </div>
    </TableCell>
  );
}

export function NemesesList({
  targetWcaId,
  targetName,
  report,
}: {
  targetWcaId: string;
  targetName: string;
  report: NemesisReport;
}) {
  const { nemeses, almost, almostTotal, slotCount } = report;
  const visibleNemeses = useLoadMore(nemeses);
  const visibleAlmost = useLoadMore(almost);

  return (
    <div className="flex flex-col gap-8">
      {nemeses.length === 0 ? (
        <p className="text-center py-6">
          <span className="font-semibold">{targetName}</span> no tiene némesis.
          Nadie en México le supera en todos sus eventos.
        </p>
      ) : (
        <section className="flex flex-col gap-4">
          <p className="text-center">
            <span className="font-semibold">{targetName}</span> tiene{" "}
            <span className="font-semibold">{nemeses.length}</span> némesis
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="hidden sm:table-cell">Estado</TableHead>
                <TableHead>Para superarle</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleNemeses.visible.map((nemesis) => (
                <TableRow key={nemesis.wcaId}>
                  <PersonCells person={nemesis} />
                  <ClosestSlotCell slot={nemesis.closest} />
                  <CompareCell
                    targetWcaId={targetWcaId}
                    wcaId={nemesis.wcaId}
                  />
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <LoadMoreButton
            onClick={visibleNemeses.loadMore}
            shown={visibleNemeses.visible.length}
            total={nemeses.length}
          />
        </section>
      )}

      {slotCount >= 2 && (
        <section className="flex flex-col gap-4">
          <div className="text-center">
            <h2 className="font-semibold text-lg">Casi némesis</h2>
            <p className="text-muted-foreground">
              Te superan en todos tus eventos excepto uno.
            </p>
          </div>
          {almost.length === 0 ? (
            <p className="text-center text-muted-foreground">
              Nadie está a un solo evento de superar a{" "}
              <span className="font-semibold">{targetName}</span>.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Estado
                    </TableHead>
                    <TableHead>Evento que le falta</TableHead>
                    <TableHead className="text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleAlmost.visible.map((person) => (
                    <TableRow key={person.wcaId}>
                      <PersonCells person={person} />
                      <MissingSlotCell slot={person.missing} />
                      <CompareCell
                        targetWcaId={targetWcaId}
                        wcaId={person.wcaId}
                      />
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <LoadMoreButton
                onClick={visibleAlmost.loadMore}
                shown={visibleAlmost.visible.length}
                total={almost.length}
              />
              {visibleAlmost.visible.length === almost.length && (
                <ShowingCount shown={almost.length} total={almostTotal} />
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
