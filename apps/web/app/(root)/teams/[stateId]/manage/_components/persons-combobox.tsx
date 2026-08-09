"use client";

import {
  Combobox,
  ComboboxAnchor,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxLoading,
  ComboboxTrigger,
} from "@workspace/ui/components/combobox";
import { ChevronDown } from "lucide-react";
import * as React from "react";

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
  const [value, setValue] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [filteredItems, setFilteredItems] = React.useState<
    {
      id: string;
      name: string;
    }[]
  >([]);

  // Debounce search with loading simulation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = React.useCallback(
    debounce(async (searchTerm: string) => {
      setIsLoading(true);
      setProgress(0);

      // Simulate a more realistic progress pattern
      const progressSteps = [15, 35, 65, 85, 95] as const;
      let currentStepIndex = 0;

      const interval = setInterval(() => {
        if (currentStepIndex < progressSteps.length) {
          setProgress(progressSteps[currentStepIndex] ?? 0);
          currentStepIndex++;
        }
      }, 150);

      try {
        const params = new URLSearchParams({
          search: searchTerm,
          stateId,
        });
        const response = await fetch(
          `/api/get-persons-without-state?${params.toString()}`,
        );

        if (!response.ok) {
          setFilteredItems([]);
          setProgress(100);
          return;
        }

        const data = await response.json();

        const results = data?.data as {
          id: string;
          name: string;
        }[];

        setFilteredItems(results ?? []);
        setProgress(100);
      } catch (error) {
        console.error("Error fetching persons:", error);
        setFilteredItems([]);
      } finally {
        setIsLoading(false);
        clearInterval(interval);
      }
    }, 300),
    [stateId],
  );

  const onInputValueChange = React.useCallback(
    (value: string) => {
      setSearch(value);
      debouncedSearch(value);
    },
    [debouncedSearch],
  );

  return (
    <Combobox
      value={value}
      onValueChange={setValue}
      inputValue={search}
      onInputValueChange={onInputValueChange}
      manualFiltering
    >
      <input type="text" name="personId" hidden defaultValue={value} />
      <ComboboxLabel className="group-data-[invalid=true]/field:text-destructive">
        Competidor
      </ComboboxLabel>
      <ComboboxAnchor>
        <ComboboxInput
          placeholder="Buscar competidor..."
          className="group-data-[invalid=true]/field:border-destructive focus-visible:group-data-[invalid=true]/field:ring-destructive"
          aria-invalid={!!state.errors?.personId}
          aria-errormessage="error-personId"
        />
        <ComboboxTrigger>
          <ChevronDown className="h-4 w-4" />
        </ComboboxTrigger>
      </ComboboxAnchor>
      <ComboboxContent>
        {isLoading ? (
          <ComboboxLoading value={progress} label="Buscando competidor..." />
        ) : filteredItems.length === 0 ? (
          <ComboboxEmpty keepVisible={!isLoading && filteredItems.length === 0}>
            No se encontraron competidores.
          </ComboboxEmpty>
        ) : (
          filteredItems.map((item) => (
            <ComboboxItem key={item.id} value={item.id} outset>
              {item.name} ({item.id})
            </ComboboxItem>
          ))
        )}
      </ComboboxContent>
    </Combobox>
  );
}

function debounce<TFunction extends (...args: never[]) => unknown>(
  func: TFunction,
  wait: number,
): (...args: Parameters<TFunction>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return function (this: unknown, ...args: Parameters<TFunction>): void {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}
