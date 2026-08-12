"use client";

import * as React from "react";
import { State } from "@workspace/db/schema";
import { parseAsString, useQueryStates } from "nuqs";
import { StateLabel } from "@/components/state-flag";
import { StateSelector as SharedStateSelector } from "@/components/state-selector";
import { toggleSelectedValue } from "@/lib/selectors";

interface StateSelectorProps {
  states: State[];
}

export function StateSelector({ states }: StateSelectorProps) {
  const [queryState, setQueryState] = useQueryStates(
    {
      state: parseAsString.withDefault(""),
    },
    {
      clearOnDefault: true,
      shallow: false,
    },
  );

  const selectedName = queryState.state;

  return (
    <SharedStateSelector
      states={states}
      trigger={
        selectedName.length ? (
          <StateLabel stateName={selectedName} />
        ) : (
          "Seleccionar estado"
        )
      }
      isSelected={(state) => selectedName === state.name}
      onSelect={(state) =>
        setQueryState({
          state: toggleSelectedValue(selectedName, state.name),
        })
      }
      buttonClassName="w-full"
      popoverContentClassName="p-0"
    />
  );
}
