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
import { State } from "@workspace/db/schema";
import { redirect } from "next/navigation";
import { StateFlag, StateLabel } from "@/components/state-flag";

interface StateSelecorProps {
  stateName: string;
  states: State[];
}

export function StateSelector({ stateName, states }: StateSelecorProps) {
  const handleToggle = (value: string) => {
    redirect(`/kinch/${value}`);
  };

  return (
    <Popover modal>
      <PopoverTrigger asChild>
        <Button
          aria-label="Seleccionar estado"
          variant="outline"
          role="combobox"
          size="sm"
          className="ml-auto h-8 gap-2 focus:outline-none focus:ring-1 focus:ring-ring focus-visible:ring-0 mb-6"
        >
          <StateLabel stateName={stateName} />
          <ChevronsUpDown className="ml-auto shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-fit p-0">
        <Command>
          <CommandInput placeholder="Buscar estado..." />
          <CommandList>
            <CommandEmpty>No se encontraron estados.</CommandEmpty>
            <CommandGroup>
              {states.map((state) => (
                <CommandItem
                  key={state.id}
                  onSelect={() => handleToggle(state.id)}
                >
                  <StateFlag stateId={state.id} />
                  <span className="truncate">{state.name}</span>
                  <Check
                    className={cn(
                      "ml-auto size-4 shrink-0",
                      stateName === state.name ? "opacity-100" : "opacity-0",
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
