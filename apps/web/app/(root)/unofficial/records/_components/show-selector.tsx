"use client";

import { parseAsStringEnum, useQueryStates } from "nuqs";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";

const SHOW_MODES = ["current", "history"] as const;
const SHOW_LABELS: Record<(typeof SHOW_MODES)[number], string> = {
  current: "Actuales",
  history: "Historial",
};

export function CcRecordsShowSelector() {
  const [{ show }, setQueryState] = useQueryStates(
    { show: parseAsStringEnum([...SHOW_MODES]).withDefault("current") },
    { clearOnDefault: true, shallow: false },
  );

  return (
    <div className="flex flex-col gap-2 sm:max-w-md">
      <span className="font-semibold text-sm">Mostrar</span>
      <ToggleGroup type="single" variant="outline" value={show}>
        {SHOW_MODES.map((mode) => (
          <ToggleGroupItem
            key={mode}
            className="flex-1"
            value={mode}
            aria-label={SHOW_LABELS[mode]}
            onClick={() => setQueryState({ show: mode })}
          >
            {SHOW_LABELS[mode]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
