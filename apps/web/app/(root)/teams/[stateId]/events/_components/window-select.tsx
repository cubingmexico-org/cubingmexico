"use client";

import { parseAsStringLiteral, useQueryStates } from "nuqs";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";

const WINDOWS = ["2y", "all"] as const;

export function WindowSelect() {
  const [{ window }, setQueryState] = useQueryStates(
    { window: parseAsStringLiteral(WINDOWS).withDefault("2y") },
    { clearOnDefault: true, shallow: false },
  );

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={window}
      onValueChange={(value) => {
        if (value === "2y" || value === "all") {
          void setQueryState({ window: value });
        }
      }}
    >
      <ToggleGroupItem value="2y" className="px-3">
        Últimos 2 años
      </ToggleGroupItem>
      <ToggleGroupItem value="all" className="px-3">
        Histórico
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
