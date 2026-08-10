"use client";

import * as React from "react";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import { cn } from "@workspace/ui/lib/utils";
import { parseAsString, useQueryStates } from "nuqs";

interface GenderSelectorProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function GenderSelector({ className, ...props }: GenderSelectorProps) {
  const [queryState, setQueryState] = useQueryStates(
    {
      gender: parseAsString.withDefault(""),
    },
    {
      clearOnDefault: true,
      shallow: false,
    },
  );

  const selectedGender = queryState.gender || "all";

  return (
    <div className={cn("flex flex-col gap-2", className)} {...props}>
      <span className="font-semibold text-sm">Género</span>
      <ToggleGroup
        type="single"
        variant="outline"
        value={selectedGender}
        className="w-full"
      >
        <ToggleGroupItem
          className="flex-1"
          value="all"
          aria-label="Todos"
          onClick={() => setQueryState({ gender: "" })}
        >
          Todos
        </ToggleGroupItem>
        <ToggleGroupItem
          className="flex-1"
          value="m"
          aria-label="Masculino"
          onClick={() => setQueryState({ gender: "m" })}
        >
          Masculino
        </ToggleGroupItem>
        <ToggleGroupItem
          className="flex-1"
          value="f"
          aria-label="Femenino"
          onClick={() => setQueryState({ gender: "f" })}
        >
          Femenino
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
