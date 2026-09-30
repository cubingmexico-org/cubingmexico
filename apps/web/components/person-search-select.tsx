"use client";

import * as React from "react";
import { ChevronsUpDown, Loader2, User } from "lucide-react";
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
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import type {
  SiteSearchPerson,
  SiteSearchResults,
} from "@/lib/site-search-types";

export type SelectedPerson = { wcaId: string; name: string | null } | null;

export function PersonSearchSelect({
  value,
  placeholder,
  onSelect,
}: {
  value: SelectedPerson;
  placeholder: string;
  onSelect: (wcaId: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [persons, setPersons] = React.useState<SiteSearchPerson[]>([]);
  const requestIdRef = React.useRef(0);

  const fetchPersons = useDebouncedCallback(async (searchTerm: string) => {
    const trimmed = searchTerm.trim();
    if (trimmed.length < 2) return;

    const requestId = ++requestIdRef.current;

    try {
      const params = new URLSearchParams({ q: trimmed });
      const response = await fetch(`/api/search?${params.toString()}`);
      if (requestId !== requestIdRef.current) return;

      if (!response.ok) {
        setPersons([]);
        return;
      }

      const payload = (await response.json()) as {
        success: boolean;
        data?: SiteSearchResults;
      };
      setPersons(payload.data?.persons ?? []);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      console.error("Error searching persons:", error);
      setPersons([]);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, 250);

  const onQueryChange = (next: string) => {
    setQuery(next);
    if (next.trim().length >= 2) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
      setPersons([]);
      requestIdRef.current += 1;
    }
    fetchPersons(next);
  };

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery("");
      setPersons([]);
      setIsLoading(false);
      requestIdRef.current += 1;
    }
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full min-w-0 justify-between font-normal"
        >
          <span className="truncate">
            {value ? (value.name ?? value.wcaId) : placeholder}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-64 p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Nombre o WCA ID…"
            value={query}
            onValueChange={onQueryChange}
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Buscando…
              </div>
            ) : persons.length === 0 ? (
              <CommandEmpty>
                {query.trim().length < 2
                  ? "Escribe al menos 2 caracteres para buscar."
                  : "No se encontraron competidores."}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {persons.map((person) => (
                  <CommandItem
                    key={person.wcaId}
                    value={person.wcaId}
                    onSelect={() => {
                      onOpenChange(false);
                      onSelect(person.wcaId);
                    }}
                  >
                    <User className="size-4" />
                    <span className="truncate">
                      {person.name ?? person.wcaId}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {person.wcaId}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
