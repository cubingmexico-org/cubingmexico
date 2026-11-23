"use client";

import { PersonsCombobox as SharedPersonsCombobox } from "@/components/persons-combobox";

export function PersonsCombobox({
  stateId,
  state,
}: {
  stateId: string;
  state: {
    defaultValues: Record<string, string>;
    success: boolean;
    errors: {
      [key: string]: string[] | null;
    };
  };
}) {
  return (
    <SharedPersonsCombobox
      endpoint="/api/get-persons-without-state"
      query={{ stateId }}
      state={state}
    />
  );
}
