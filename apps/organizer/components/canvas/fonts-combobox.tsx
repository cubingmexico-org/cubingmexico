"use client";

import { ChevronDown, Info } from "lucide-react";
import {
  Combobox,
  ComboboxAnchor,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxTrigger,
} from "@workspace/ui/components/combobox";
import { matchSorter } from "match-sorter";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import {
  BADGE_SYSTEM_FONTS,
  BUNDLED_FONTS,
  FONT_CATEGORIES,
} from "@/lib/fonts";

const FONT_GROUPS = [
  ...FONT_CATEGORIES.map((category) => ({
    id: category.id,
    label: category.label,
    families: BUNDLED_FONTS.filter((f) => f.category === category.id).map(
      (f) => f.family,
    ),
  })),
  {
    id: "system",
    label: "Sistema (solo gafetes)",
    families: BADGE_SYSTEM_FONTS,
  },
];

const ALL_FAMILIES = FONT_GROUPS.flatMap((group) => group.families);

interface FontsComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function FontsCombobox({ value, onValueChange }: FontsComboboxProps) {
  function onFilter(options: string[], inputValue: string) {
    const available = ALL_FAMILIES.filter((family) => options.includes(family));
    return matchSorter(available, inputValue, {
      threshold: matchSorter.rankings.MATCHES,
    });
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
            <p>
              Las fuentes del sistema solo funcionan en gafetes y pueden verse
              distintas según la computadora. ¿No encuentras la fuente que
              buscas? Solicítala.
            </p>
          </TooltipContent>
        </Tooltip>
      </ComboboxLabel>
      <ComboboxAnchor
        className="dark:bg-input/30 dark:border-input dark:hover:bg-input/50"
        style={{ fontFamily: `"${value}"` }}
      >
        <ComboboxTrigger className="w-full text-primary">
          <ComboboxInput placeholder="Seleccionar fuente..." />
          <ChevronDown className="h-4 w-4" />
        </ComboboxTrigger>
      </ComboboxAnchor>
      <ComboboxContent className="max-h-80 overflow-y-auto">
        <ComboboxEmpty>No se encontró ninguna fuente.</ComboboxEmpty>
        {FONT_GROUPS.map((group) => (
          <ComboboxGroup key={group.id}>
            <ComboboxGroupLabel>{group.label}</ComboboxGroupLabel>
            {group.families.map((family) => (
              <ComboboxItem
                key={family}
                value={family}
                style={{ fontFamily: `"${family}"` }}
              >
                {family}
              </ComboboxItem>
            ))}
          </ComboboxGroup>
        ))}
      </ComboboxContent>
    </Combobox>
  );
}
