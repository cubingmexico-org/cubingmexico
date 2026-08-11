"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { assignPersonState } from "../../_lib/actions";
import { StateFlag } from "@/components/state-flag";

type StateOption = { id: string; name: string };

type SearchResult = {
  wcaId: string;
  name: string | null;
  stateId: string | null;
  role: "admin" | "editor" | null;
};

export function AssignPersonForm({ states }: { states: StateOption[] }) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [selected, setSelected] = React.useState<SearchResult | null>(null);
  const [stateId, setStateId] = React.useState<string>("");
  const [role, setRole] = React.useState<"admin" | "editor" | "none">("none");
  const [pending, setPending] = React.useState(false);
  const [searching, setSearching] = React.useState(false);

  React.useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ search });
        const response = await fetch(
          `/api/admin/search-persons?${params.toString()}`,
        );
        const data = await response.json();
        setResults((data?.data as SearchResult[]) ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [search]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) {
      toast.error("Selecciona una persona");
      return;
    }
    if (!stateId) {
      toast.error("Selecciona un estado");
      return;
    }

    setPending(true);
    const result = await assignPersonState({
      personId: selected.wcaId,
      stateId,
      role: role === "none" ? null : role,
    });
    setPending(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Persona actualizada");
    setSelected(null);
    setSearch("");
    setResults([]);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Asignar estado / rol</CardTitle>
        <CardDescription>
          Cambia la afiliación estatal y opcionalmente el rol del team
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="person-search">Buscar persona</Label>
            <Input
              id="person-search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelected(null);
              }}
              placeholder="Nombre o WCA ID..."
            />
            {searching ? (
              <p className="text-muted-foreground text-xs">Buscando...</p>
            ) : null}
            {results.length > 0 && !selected ? (
              <ul className="max-h-48 overflow-auto rounded-md border">
                {results.map((person) => (
                  <li key={person.wcaId}>
                    <button
                      type="button"
                      className="hover:bg-muted w-full px-3 py-2 text-left text-sm"
                      onClick={() => {
                        setSelected(person);
                        setSearch(`${person.name ?? ""} (${person.wcaId})`);
                        setStateId(person.stateId ?? "");
                        setRole(person.role ?? "none");
                        setResults([]);
                      }}
                    >
                      <span className="font-medium">{person.name}</span>{" "}
                      <span className="text-muted-foreground font-mono text-xs">
                        {person.wcaId}
                      </span>
                      {person.stateId ? (
                        <span className="text-muted-foreground ml-2 text-xs">
                          · {person.stateId}
                          {person.role ? ` · ${person.role}` : ""}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={stateId || undefined} onValueChange={setStateId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  {states.map((state) => (
                    <SelectItem key={state.id} value={state.id}>
                      <span className="inline-flex items-center gap-1.5">
                        <StateFlag stateId={state.id} />
                        {state.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rol del team</Label>
              <Select
                value={role}
                onValueChange={(value) =>
                  setRole(value as "admin" | "editor" | "none")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin rol</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending || !selected}>
              {pending ? "Guardando..." : "Guardar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending || !selected}
              onClick={async () => {
                if (!selected) return;
                setPending(true);
                const result = await assignPersonState({
                  personId: selected.wcaId,
                  stateId: null,
                });
                setPending(false);
                if (result.error) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Estado eliminado");
                setSelected(null);
                setSearch("");
                router.refresh();
              }}
            >
              Quitar estado
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
