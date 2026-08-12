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
import { StateFlag } from "@/components/state-flag";

export type StateOption = {
  id: string;
  name: string;
};

interface StateSelectorProps {
  states: StateOption[];
  trigger: React.ReactNode;
  isSelected: (state: StateOption) => boolean;
  onSelect: (state: StateOption) => void;
  buttonClassName?: string;
  buttonSize?: React.ComponentProps<typeof Button>["size"];
  popoverContentClassName?: string;
  align?: React.ComponentProps<typeof PopoverContent>["align"];
}

export function StateSelector({
  states,
  trigger,
  isSelected,
  onSelect,
  buttonClassName,
  buttonSize,
  popoverContentClassName = "p-0",
  align = "end",
}: StateSelectorProps) {
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  return (
    <Popover modal>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          aria-label="Seleccionar estado"
          variant="outline"
          role="combobox"
          size={buttonSize}
          className={cn(
            "gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            buttonClassName,
          )}
        >
          {trigger}
          <ChevronsUpDown className="ml-auto shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className={popoverContentClassName}
        onCloseAutoFocus={() => triggerRef.current?.focus()}
      >
        <Command>
          <CommandInput placeholder="Buscar estado..." />
          <CommandList>
            <CommandEmpty>No se encontraron estados.</CommandEmpty>
            <CommandGroup>
              {states.map((state) => (
                <CommandItem key={state.id} onSelect={() => onSelect(state)}>
                  <StateFlag stateId={state.id} />
                  <span className="truncate">{state.name}</span>
                  <Check
                    className={cn(
                      "ml-auto size-4 shrink-0",
                      isSelected(state) ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
