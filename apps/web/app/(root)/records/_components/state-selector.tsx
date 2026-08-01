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
import { parseAsString, useQueryStates } from "nuqs";

interface StateSelecorProps {
  states: State[];
}

export function StateSelector({ states }: StateSelecorProps) {
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [queryState, setQueryState] = useQueryStates(
    {
      state: parseAsString.withDefault(""),
    },
    {
      clearOnDefault: true,
      shallow: false,
    },
  );

  const memoizedState = React.useMemo(() => {
    return queryState.state;
  }, [queryState]);

  const handleToggle = (value: string) => {
    setQueryState({ state: memoizedState === value ? "" : value });
  };

  return (
    <Popover modal>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          aria-label="Seleccionar estado"
          variant="outline"
          role="combobox"
          className="gap-2 focus:outline-none focus:ring-1 focus:ring-ring focus-visible:ring-0 w-full"
        >
          {memoizedState.length ? memoizedState : "Seleccionar estado"}
          <ChevronsUpDown className="ml-auto shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="p-0"
        onCloseAutoFocus={() => triggerRef.current?.focus()}
      >
        <Command>
          <CommandInput placeholder="Buscar estado..." />
          <CommandList>
            <CommandEmpty>No se encontraron estados.</CommandEmpty>
            <CommandGroup>
              {states.map((state) => (
                <CommandItem
                  key={state.id}
                  onSelect={() => handleToggle(state.name)}
                >
                  <span className="truncate">{state.name}</span>
                  <Check
                    className={cn(
                      "ml-auto size-4 shrink-0",
                      memoizedState === state.name
                        ? "opacity-100"
                        : "opacity-0",
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
