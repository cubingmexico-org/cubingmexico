"use client";

import * as React from "react";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { cn } from "@workspace/ui/lib/utils";
import { parseAsStringEnum, useQueryStates } from "nuqs";
import { SHOW_MODES, type ShowMode } from "../_lib/show-modes";

interface ShowSelectorProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

const SHOW_LABELS: Record<ShowMode, string> = {
  mixed: "Mixto",
  slim: "Compacto",
  separate: "Separado",
  history: "Historial",
  "mixed-history": "Historial mixto",
};

export function ShowSelector({ className, ...props }: ShowSelectorProps) {
  const [queryState, setQueryState] = useQueryStates(
    {
      show: parseAsStringEnum([...SHOW_MODES]).withDefault("mixed"),
    },
    {
      clearOnDefault: true,
      shallow: false,
    },
  );

  const selectedShow = queryState.show;

  return (
    <div className={cn("flex flex-col gap-2", className)} {...props}>
      <span className="font-semibold text-sm">Mostrar</span>
      <Select
        value={selectedShow}
        onValueChange={(value) => setQueryState({ show: value as ShowMode })}
      >
        <SelectTrigger className="w-full sm:hidden">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SHOW_MODES.map((mode) => (
            <SelectItem key={mode} value={mode}>
              {SHOW_LABELS[mode]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ToggleGroup
        type="single"
        variant="outline"
        value={selectedShow}
        className="hidden w-full sm:flex"
      >
        {SHOW_MODES.map((mode) => (
          <ToggleGroupItem
            key={mode}
            className="flex-1 min-w-0"
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
