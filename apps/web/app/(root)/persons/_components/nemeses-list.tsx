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
import { formatAttemptValue } from "@/lib/utils";
import type {
  NemesisReport,
  NemesisSlot,
  PersonNemesis,
} from "../_lib/nemesis-queries";

function formatGap(slot: NemesisSlot, gap: number) {
  if (slot.eventId === "333mbf") return null;
  if (gap === 0) return "empate";
  const formatted = formatAttemptValue(slot.eventId, Math.abs(gap), slot.type);
  return formatted ? `${gap < 0 ? "-" : "+"}${formatted}` : null;
}

function SlotEvent({ slot }: { slot: NemesisSlot }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`cubing-icon event-${slot.eventId}`}
        title={slot.eventName}
      />
      <span className="text-sm text-muted-foreground">
        {slot.type === "single" ? "Single" : "Average"}
      </span>
    </div>
  );
}

function ClosestSlotCell({ slot }: { slot: NemesisSlot }) {
  const target =
    slot.otherBest != null
      ? formatAttemptValue(slot.eventId, slot.otherBest, slot.type)
      : null;
  const gap =
    slot.otherBest != null
      ? formatGap(slot, slot.otherBest - slot.targetBest)
      : null;

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
  const theirs =
    slot.otherBest != null
      ? formatAttemptValue(slot.eventId, slot.otherBest, slot.type)
      : null;
  const yours = formatAttemptValue(slot.eventId, slot.targetBest, slot.type);
  const gap =
    slot.otherBest != null
      ? formatGap(slot, slot.otherBest - slot.targetBest)
      : null;

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

function PersonCells({ person }: { person: PersonNemesis }) {
  return (
    <>
      <TableCell>
        <Link
          href={`/persons/${person.wcaId}`}
          className="text-link hover:text-link/80"
        >
          {person.name ?? person.wcaId}
        </Link>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        {person.stateName ? (
          <StateLabel stateId={person.stateId} stateName={person.stateName} />
        ) : (
          <span className="text-muted-foreground font-thin">N/A</span>
        )}
      </TableCell>
    </>
  );
}

function CompareCell({
  targetWcaId,
  wcaId,
}: {
  targetWcaId: string;
  wcaId: string;
}) {
  return (
    <TableCell className="text-right">
      <Button variant="outline" size="sm" asChild>
        <Link href={`/persons/compare?a=${targetWcaId}&b=${wcaId}`}>
          <Swords className="size-4" />
          <span className="hidden sm:inline">Comparar</span>
        </Link>
      </Button>
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
              {nemeses.map((nemesis) => (
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
                  {almost.map((person) => (
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
              {almostTotal > almost.length && (
                <p className="text-center text-sm text-muted-foreground">
                  Mostrando {almost.length} de {almostTotal}
                </p>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
