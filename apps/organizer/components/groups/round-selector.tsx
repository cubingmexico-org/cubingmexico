"use client";

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Label } from "@workspace/ui/components/label";
import type { WCIF } from "@/types/wcif";

const EVENT_NAMES: Record<string, string> = {
  "333": "3x3x3",
  "222": "2x2x2",
  "444": "4x4x4",
  "555": "5x5x5",
  "666": "6x6x6",
  "777": "7x7x7",
  "333bf": "3x3x3 a ciegas",
  "333fm": "3x3x3 fewest moves",
  "333oh": "3x3x3 a una mano",
  "333ft": "3x3x3 con pies",
  clock: "Clock",
  minx: "Megaminx",
  pyram: "Pyraminx",
  skewb: "Skewb",
  sq1: "Square-1",
  "444bf": "4x4x4 a ciegas",
  "555bf": "5x5x5 a ciegas",
  "333mbf": "3x3x3 multi a ciegas",
};

export function RoundSelector({
  wcif,
  selectedRoundId,
  onSelect,
}: {
  wcif: WCIF;
  selectedRoundId: string | null;
  onSelect: (roundId: string) => void;
}) {
  const options = useMemo(() => {
    return wcif.events.flatMap((event) =>
      event.rounds.map((round, index) => ({
        id: round.id,
        label: `${EVENT_NAMES[event.id] ?? event.id} — Ronda ${index + 1}`,
      })),
    );
  }, [wcif.events]);

  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta competencia no tiene rondas en el WCIF.
      </p>
    );
  }

  return (
    <div className="space-y-2 max-w-sm">
      <Label htmlFor="round-select">Ronda</Label>
      <Select value={selectedRoundId ?? undefined} onValueChange={onSelect}>
        <SelectTrigger id="round-select">
          <SelectValue placeholder="Selecciona una ronda" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
