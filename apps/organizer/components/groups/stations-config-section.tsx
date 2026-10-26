"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { NumberInput } from "@/components/number-input";
import type { WCIF } from "@/types/wcif";
import { setRoomStations } from "@/lib/groups/config";
import {
  listRooms,
  suggestStationsBreakdown,
} from "@/lib/groups/config-suggestions";

export function StationsConfigSection({
  wcif,
  onApply,
}: {
  wcif: WCIF;
  onApply: (next: WCIF) => void;
}) {
  const rooms = useMemo(() => listRooms(wcif), [wcif]);
  const stationsSuggestion = useMemo(
    () => suggestStationsBreakdown(wcif),
    [wcif],
  );

  const applySuggestedStations = () => {
    let next = wcif;
    for (const { room } of rooms) {
      next = setRoomStations(next, room.id, stationsSuggestion.perRoom);
    }
    onApply(next);
    toast.success(
      stationsSuggestion.roomCount > 1
        ? `Sugerencia: ${stationsSuggestion.perRoom} por zona (${stationsSuggestion.total} en total)`
        : `Sugerencia: ${stationsSuggestion.perRoom} estaciones`,
    );
  };

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div>
        <h3 className="font-semibold">Estaciones por sala</h3>
        <p className="text-sm text-muted-foreground">
          Timers físicos por zona. Sugerido:{" "}
          <strong>{stationsSuggestion.perRoom}</strong>
          {stationsSuggestion.roomCount > 1
            ? ` por sala (${stationsSuggestion.total} en total)`
            : " estaciones"}
          {stationsSuggestion.competitors > 0
            ? ` · ~${stationsSuggestion.competitors} inscritos en el evento más grande`
            : ""}
          . Campeonatos con muchas zonas: ajústalo a mano (puede ser 32+).
        </p>
      </div>
      <div className="space-y-3">
        {rooms.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay salas en el horario WCIF.
          </p>
        ) : (
          rooms.map(({ room, venueName, config: roomConfig }) => (
            <div
              key={room.id}
              className="flex flex-wrap items-center gap-3 max-w-lg"
            >
              <Label className="w-48 shrink-0 truncate" title={room.name}>
                {room.name}
                <span className="block text-xs text-muted-foreground font-normal">
                  {venueName}
                </span>
              </Label>
              <NumberInput
                min={0}
                max={64}
                className="w-28"
                value={roomConfig.stations}
                onValueChange={(value) => {
                  onApply(setRoomStations(wcif, room.id, value));
                }}
              />
            </div>
          ))
        )}
      </div>
      <Button type="button" variant="outline" onClick={applySuggestedStations}>
        Aplicar sugerencia ({stationsSuggestion.perRoom}
        {stationsSuggestion.roomCount > 1 ? "/sala" : ""})
      </Button>
    </section>
  );
}
