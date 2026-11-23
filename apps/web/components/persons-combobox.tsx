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
import { reportError } from "@/lib/report-error";

export function PersonsCombobox({
  endpoint,
  query,
  state,
}: {
  /** API route that returns `{ success, data: { id, name }[] }`. */
  endpoint: string;
  /** Extra query params merged with `search` (e.g. `{ stateId }` or `{ groupId }`). */
  query: Record<string, string>;
  state: {
    defaultValues: Record<string, string>;
    success: boolean;
    errors: string | { [key: string]: string[] | null } | null;
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

  const queryKey = JSON.stringify(query);

  // Debounce search with loading simulation
  const debouncedSearch = React.useMemo(
    () =>
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
            ...(JSON.parse(queryKey) as Record<string, string>),
            search: searchTerm,
          });
          const response = await fetch(`${endpoint}?${params.toString()}`);

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
          reportError(error);
          setFilteredItems([]);
        } finally {
          setIsLoading(false);
          clearInterval(interval);
        }
      }, 300),
    [endpoint, queryKey],
  );

  const onInputValueChange = React.useCallback(
    (next: string) => {
      setSearch(next);
      debouncedSearch(next);
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
      <input type="text" name="personId" hidden value={value} readOnly />
      <ComboboxLabel className="group-data-[invalid=true]/field:text-destructive">
        Competidor
      </ComboboxLabel>
      <ComboboxAnchor>
        <ComboboxInput
          placeholder="Buscar competidor..."
          className="group-data-[invalid=true]/field:border-destructive focus-visible:group-data-[invalid=true]/field:ring-destructive"
          aria-invalid={!!state.errors}
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
