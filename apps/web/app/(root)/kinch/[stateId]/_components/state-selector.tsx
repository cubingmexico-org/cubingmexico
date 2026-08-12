"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { State } from "@workspace/db/schema";
import { StateLabel } from "@/components/state-flag";
import { StateSelector as SharedStateSelector } from "@/components/state-selector";

interface StateSelectorProps {
  stateName: string;
  states: State[];
}

export function StateSelector({ stateName, states }: StateSelectorProps) {
  const router = useRouter();

  return (
    <SharedStateSelector
      states={states}
      trigger={<StateLabel stateName={stateName} />}
      isSelected={(state) => stateName === state.name}
      onSelect={(state) => router.push(`/kinch/${state.id}`)}
      buttonSize="sm"
      buttonClassName="ml-auto h-8 mb-6"
      popoverContentClassName="w-fit p-0"
    />
  );
}
