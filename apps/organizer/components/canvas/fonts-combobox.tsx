"use client";

import { ChevronDown, Info } from "lucide-react";
import * as React from "react";
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
import { matchSorter } from "match-sorter";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";

const SYSTEM_FONTS = [
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Georgia",
  "Courier New",
  "Verdana",
  "Comic Sans MS",
  "Impact",
  // Custom fonts
  "Santa Monday",
  "Basically A Sans Serif Font",
  "Rubik",
];

interface FontsComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function DynamicFontsCombobox({
  value,
  onValueChange,
}: FontsComboboxProps) {
  const [search, setSearch] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [filteredItems, setFilteredItems] = React.useState<
    { value: string; label: string }[]
  >([]);

  // Debounce search - only search when user types
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = React.useCallback(
    debounce(async (searchTerm: string) => {
      if (!searchTerm.trim()) {
        setFilteredItems([]);
        return;
      }

      setIsLoading(true);
      setProgress(0);

      const progressSteps = [15, 35, 65, 85, 95] as const;
      let currentStepIndex = 0;

      const interval = setInterval(() => {
        if (currentStepIndex < progressSteps.length) {
          setProgress(progressSteps[currentStepIndex] ?? 0);
          currentStepIndex++;
        }
      }, 150);

      try {
        // const fonts = await searchGoogleFonts(searchTerm);
        const results = SYSTEM_FONTS.map((font) => ({
          value: font,
          label: font,
        }));
        setFilteredItems(results);
        setProgress(100);
      } catch (error) {
        console.error("Error searching fonts:", error);
        setFilteredItems([]);
      } finally {
        setIsLoading(false);
        clearInterval(interval);
      }
    }, 300),
    [],
  );

  const onInputValueChange = React.useCallback(
    (value: string) => {
      setSearch(value);
      debouncedSearch(value);
    },
    [debouncedSearch],
  );

  const handleValueChange = async (newValue: string) => {
    // Load font dynamically
    // await loadGoogleFont(newValue);
    onValueChange(newValue);
  };

  return (
    <Combobox
      value={value}
      onValueChange={handleValueChange}
      inputValue={search}
      onInputValueChange={onInputValueChange}
      manualFiltering
    >
      <ComboboxLabel>Familia de fuente</ComboboxLabel>
      <ComboboxAnchor>
        <ComboboxInput placeholder="Buscar fuente..." />
        <ComboboxTrigger>
          <ChevronDown className="h-4 w-4" />
        </ComboboxTrigger>
      </ComboboxAnchor>
      <ComboboxContent>
        {isLoading ? (
          <ComboboxLoading value={progress} label="Buscando fuentes..." />
        ) : null}
        <ComboboxEmpty keepVisible={!isLoading && filteredItems.length === 0}>
          {search.trim()
            ? "No se encontró ninguna fuente."
            : "Escribe para buscar fuentes..."}
        </ComboboxEmpty>
        {!isLoading &&
          filteredItems.map((font) => (
            <ComboboxItem
              key={font.value}
              value={font.value}
              outset
              style={{ fontFamily: font.value }}
            >
              {font.label}
            </ComboboxItem>
          ))}
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

export function FontsCombobox({ value, onValueChange }: FontsComboboxProps) {
  const fonts = SYSTEM_FONTS.map((font) => ({ value: font, label: font }));

  function onFilter(options: string[], inputValue: string) {
    const fontOptions = fonts.filter((font) => options.includes(font.value));
    return matchSorter(fontOptions, inputValue, {
      keys: ["label", "value"],
      threshold: matchSorter.rankings.MATCHES,
    }).map((font) => font.value);
  }

  return (
    <Combobox
      value={value}
      onValueChange={onValueChange}
      onFilter={onFilter}
      inputValue={value}
    >
      <ComboboxLabel className="text-xs flex items-center gap-1">
        <span>Fuente</span>
        <Tooltip>
          <TooltipTrigger>
            <Info size={12} />
          </TooltipTrigger>
          <TooltipContent>
            <p>¿No encuentras la fuente que buscas? Solicítala.</p>
          </TooltipContent>
        </Tooltip>
      </ComboboxLabel>
      <ComboboxAnchor
        className="dark:bg-input/30 dark:border-input dark:hover:bg-input/50"
        style={{ fontFamily: value }}
      >
        <ComboboxTrigger className="w-full text-primary">
          <ComboboxInput placeholder="Seleccionar fuente..." />
          <ChevronDown className="h-4 w-4" />
        </ComboboxTrigger>
      </ComboboxAnchor>
      <ComboboxContent>
        <ComboboxEmpty>No se encontró ninguna fuente.</ComboboxEmpty>
        {fonts.map((font) => (
          <ComboboxItem
            key={font.value}
            value={font.value}
            style={{ fontFamily: font.value }}
          >
            {font.label}
          </ComboboxItem>
        ))}
      </ComboboxContent>
    </Combobox>
  );
}
