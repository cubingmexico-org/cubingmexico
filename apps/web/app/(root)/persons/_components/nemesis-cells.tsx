import Link from "next/link";
import { Swords } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { TableCell } from "@workspace/ui/components/table";
import { StateLabel } from "@/components/state-flag";
import { formatAttemptValue } from "@/lib/utils";
import type { NemesisSlot, PersonNemesis } from "../_lib/nemesis-queries";

export function formatSlotValue(slot: NemesisSlot, value: number | null) {
  return value != null
    ? formatAttemptValue(slot.eventId, value, slot.type)
    : null;
}

/** Formats `otherBest - targetBest`, or null when either side is missing. */
export function formatSlotGap(slot: NemesisSlot) {
  if (slot.otherBest == null || slot.targetBest == null) return null;
  if (slot.eventId === "333mbf") return null;
  const gap = slot.otherBest - slot.targetBest;
  if (gap === 0) return "empate";
  const formatted = formatAttemptValue(slot.eventId, Math.abs(gap), slot.type);
  return formatted ? `${gap < 0 ? "-" : "+"}${formatted}` : null;
}

export function SlotEvent({ slot }: { slot: NemesisSlot }) {
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

export function PersonCells({ person }: { person: PersonNemesis }) {
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

export function CompareCell({
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

export function ShowingCount({
  shown,
  total,
}: {
  shown: number;
  total: number;
}) {
  if (total <= shown) return null;
  return (
    <p className="text-center text-sm text-muted-foreground">
      Mostrando {shown} de {total}
    </p>
  );
}
