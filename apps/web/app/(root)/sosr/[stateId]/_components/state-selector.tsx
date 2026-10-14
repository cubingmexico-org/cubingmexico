"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { State } from "@workspace/db/schema";
import { StateLabel } from "@/components/state-flag";
import { StateSelector as SharedStateSelector } from "@/components/state-selector";
import { useDeprecatedQuery } from "@/components/deprecated-events-switch";

interface StateSelectorProps {
  states: State[];
  stateId: string;
  stateName: string;
  rankType: "single" | "average";
}

export function StateSelector({
  states,
  stateId,
  stateName,
  rankType,
}: StateSelectorProps) {
  const router = useRouter();
  const query = useDeprecatedQuery();

  return (
    <SharedStateSelector
      states={states}
      trigger={<StateLabel stateId={stateId} stateName={stateName} />}
      isSelected={(state) => stateId === state.id}
      onSelect={(state) => router.push(`/sosr/${state.id}/${rankType}${query}`)}
      buttonSize="sm"
      buttonClassName="w-full"
      popoverContentClassName="w-fit p-0"
    />
  );
}
