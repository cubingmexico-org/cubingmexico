"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Calendar,
  FileText,
  Loader2,
  Search,
  User,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@workspace/ui/components/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { cn } from "@workspace/ui/lib/utils";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { filterSitePages, type SitePage } from "@/lib/site-pages";
import type { SiteSearchResults } from "@/lib/site-search-types";

const EMPTY_RESULTS: SiteSearchResults = {
  persons: [],
  competitions: [],
  teams: [],
};

export function HeaderSearch() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [results, setResults] =
    React.useState<SiteSearchResults>(EMPTY_RESULTS);
  const requestIdRef = React.useRef(0);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(EMPTY_RESULTS);
      setIsLoading(false);
      requestIdRef.current += 1;
    }
  }, [open]);

  const fetchResults = useDebouncedCallback(async (searchTerm: string) => {
    const trimmed = searchTerm.trim();

    if (trimmed.length < 2) {
      setResults(EMPTY_RESULTS);
      setIsLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);

    try {
      const params = new URLSearchParams({ q: trimmed });
      const response = await fetch(`/api/search?${params.toString()}`);

      if (requestId !== requestIdRef.current) return;

      if (!response.ok) {
        setResults(EMPTY_RESULTS);
        return;
      }

      const payload = (await response.json()) as {
        success: boolean;
        data?: SiteSearchResults;
      };

      setResults(payload.data ?? EMPTY_RESULTS);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      console.error("Error searching:", error);
      setResults(EMPTY_RESULTS);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, 250);

  const onQueryChange = (value: string) => {
    setQuery(value);
    if (value.trim().length >= 2) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
      setResults(EMPTY_RESULTS);
      requestIdRef.current += 1;
    }
    fetchResults(value);
  };

  const pages: SitePage[] = filterSitePages(query);

  const hasEntityResults =
    results.persons.length > 0 ||
    results.competitions.length > 0 ||
    results.teams.length > 0;

  const showEmpty = !isLoading && pages.length === 0 && !hasEntityResults;

  const navigate = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
        className={cn(
          "text-white hover:bg-white/10 hover:text-white",
          "h-9 gap-2 px-2.5 sm:px-3",
        )}
        aria-label="Buscar"
      >
        <Search className="size-4" />
        <span className="hidden sm:inline">Buscar…</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-white/20 bg-white/10 px-1.5 font-mono text-[10px] font-medium text-white/70 sm:inline-flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader className="sr-only">
          <DialogTitle>Buscar</DialogTitle>
          <DialogDescription>
            Busca personas, competencias, teams y páginas del sitio.
          </DialogDescription>
        </DialogHeader>
        <DialogContent className="overflow-hidden p-0" showCloseButton={false}>
          <Command shouldFilter={false} className="rounded-lg border-0">
            <CommandInput
              placeholder="Personas, competencias, teams…"
              value={query}
              onValueChange={onQueryChange}
            />
            <CommandList>
              {showEmpty ? (
                <CommandEmpty>
                  {query.trim().length < 2
                    ? "Escribe al menos 2 caracteres para buscar."
                    : "No se encontraron resultados."}
                </CommandEmpty>
              ) : null}

              {pages.length > 0 ? (
                <CommandGroup heading="Páginas">
                  {pages.map((page) => (
                    <CommandItem
                      key={page.href}
                      value={`page-${page.href}`}
                      onSelect={() => navigate(page.href)}
                    >
                      <FileText className="size-4" />
                      <span>{page.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}

              {isLoading || hasEntityResults ? <CommandSeparator /> : null}

              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Buscando…
                </div>
              ) : null}

              {!isLoading && results.persons.length > 0 ? (
                <CommandGroup heading="Personas">
                  {results.persons.map((p) => (
                    <CommandItem
                      key={p.wcaId}
                      value={`person-${p.wcaId}`}
                      onSelect={() => navigate(`/persons/${p.wcaId}`)}
                    >
                      <User className="size-4" />
                      <span className="truncate">{p.name ?? p.wcaId}</span>
                      <span className="ml-auto font-mono text-xs text-muted-foreground">
                        {p.wcaId}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}

              {!isLoading && results.competitions.length > 0 ? (
                <CommandGroup heading="Competencias">
                  {results.competitions.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={`competition-${c.id}`}
                      onSelect={() => navigate(`/competitions/${c.id}`)}
                    >
                      <Calendar className="size-4" />
                      <span className="truncate">{c.name}</span>
                      <span className="ml-auto truncate text-xs text-muted-foreground">
                        {c.cityName}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}

              {!isLoading && results.teams.length > 0 ? (
                <CommandGroup heading="Teams">
                  {results.teams.map((t) => (
                    <CommandItem
                      key={t.stateId}
                      value={`team-${t.stateId}`}
                      onSelect={() => navigate(`/teams/${t.stateId}`)}
                    >
                      <Building2 className="size-4" />
                      <span className="truncate">{t.name}</span>
                      <span className="ml-auto truncate text-xs text-muted-foreground">
                        {t.stateName}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
