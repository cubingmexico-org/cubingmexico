"use client";

import { X } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";
import { SHOW_MODES } from "../_lib/show-modes";

export function ClearFiltersButton() {
  const [queryState, setQueryState] = useQueryStates(
    {
      event: parseAsString.withDefault(""),
      state: parseAsString.withDefault(""),
      gender: parseAsString.withDefault(""),
      show: parseAsStringEnum([...SHOW_MODES]).withDefault("mixed"),
      asOf: parseAsString.withDefault(""),
    },
    {
      clearOnDefault: true,
      shallow: false,
    },
  );

  const hasFilters =
    queryState.event !== "" ||
    queryState.state !== "" ||
    queryState.gender !== "" ||
    queryState.show !== "mixed" ||
    queryState.asOf !== "";

  if (!hasFilters) return null;

  return (
    <Button
      aria-label="Limpiar filtros"
      variant="outline"
      size="sm"
      className="border-dashed self-start"
      onClick={() =>
        setQueryState({
          event: "",
          state: "",
          gender: "",
          show: "mixed",
          asOf: "",
        })
      }
    >
      <X />
      Limpiar
    </Button>
  );
}
