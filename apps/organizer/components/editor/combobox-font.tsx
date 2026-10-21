"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { cn } from "@workspace/ui/lib/utils";
import { BUNDLED_FONTS, FONT_CATEGORIES } from "@/lib/fonts";

interface ComboboxFontProps {
  value: string;
  setValue: (value: string) => void;
  disabled?: boolean;
}

export function ComboboxFont({
  value,
  setValue,
  disabled,
}: ComboboxFontProps): React.JSX.Element {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className="w-40 justify-between"
          disabled={disabled}
          role="combobox"
          variant="outline"
        >
          {value ? (
            <p className="truncate" style={{ fontFamily: `"${value}"` }}>
              {value}
            </p>
          ) : (
            "Buscar fuente..."
          )}
          <ChevronsUpDown className="shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Buscar fuente..." />
          <CommandList>
            <CommandEmpty>Sin resultados.</CommandEmpty>
            {FONT_CATEGORIES.map((category) => (
              <CommandGroup heading={category.label} key={category.id}>
                {BUNDLED_FONTS.filter(
                  (font) => font.category === category.id,
                ).map((font) => (
                  <CommandItem
                    key={font.family}
                    onSelect={() => {
                      setValue(font.family === value ? "" : font.family);
                      setOpen(false);
                    }}
                    value={font.family}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === font.family ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <p style={{ fontFamily: `"${font.family}"` }}>
                      {font.family}
                    </p>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
