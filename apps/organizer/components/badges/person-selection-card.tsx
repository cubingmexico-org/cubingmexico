"use client";

import { useState } from "react";
import { Check, Settings, X } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Switch } from "@workspace/ui/components/switch";
import type { State, Team } from "@/db/queries";
import type { Competition } from "@/types/wca";
import type { ExtendedPerson, WCIF } from "@/types/wcif";
import { ExportBadgesButtonGroup } from "@/components/export-badges-button-group";
import { filterPersons, groupPersons } from "./group-persons";
import { PersonGroupList } from "./person-group-list";

export function PersonSelectionCard({
  competition,
  persons,
  states,
  teams,
  wcif,
  competitionLogoUrl,
}: {
  competition: Competition;
  persons: ExtendedPerson[];
  states: State[];
  teams: Team[];
  wcif: WCIF;
  competitionLogoUrl?: string | null;
}) {
  const [selectedPersons, setSelectedPersons] = useState<ExtendedPerson[]>([]);
  const [search, setSearch] = useState("");
  const [showOnlyCompeting, setShowOnlyCompeting] = useState<boolean>(false);

  const filteredPersons = filterPersons(persons, search, showOnlyCompeting);

  const selectAll = (list: ExtendedPerson[]) => {
    setSelectedPersons((prev) => {
      const existingIds = new Set(prev.map((p) => p.registrantId));
      return [...prev, ...list.filter((p) => !existingIds.has(p.registrantId))];
    });
  };

  const setSelected = (person: ExtendedPerson, selected: boolean) => {
    setSelectedPersons((prev) => {
      if (!selected) {
        return prev.filter((p) => p.registrantId !== person.registrantId);
      }
      return prev.some((p) => p.registrantId === person.registrantId)
        ? prev
        : [...prev, person];
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="mr-2 h-5 w-5" />
          Configuración
        </CardTitle>
        <CardDescription>
          Selecciona los participantes para los que se generarán los gafetes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Buscar participante"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
          }}
        />
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-medium">Participantes</h4>
            <div className="flex items-center gap-2">
              <Label htmlFor="show-only-competing" className="text-xs">
                Mostrar solo competidores
              </Label>
              <Switch
                id="show-only-competing"
                checked={showOnlyCompeting}
                onCheckedChange={(v) => setShowOnlyCompeting(Boolean(v))}
              />
            </div>
          </div>
          <ScrollArea
            className="h-80 rounded-md border bg-muted/20 p-4"
            type="always"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredPersons.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No se encontraron participantes
                </p>
              ) : (
                <PersonGroupList
                  groups={groupPersons(filteredPersons)}
                  selectedPersons={selectedPersons}
                  onSelectAll={selectAll}
                  onSelectedChange={setSelected}
                />
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <div className="flex flex-wrap justify-start gap-2 w-full">
          <Button
            aria-label="Seleccionar todos"
            disabled={selectedPersons.length === persons.length}
            onClick={() => {
              setSelectedPersons(persons);
            }}
            variant="ghost"
            className="gap-2 transition-all"
          >
            <Check />
            Seleccionar todos
          </Button>
          {selectedPersons.length > 0 && (
            <Button
              aria-label="Borrar selección"
              onClick={() => {
                setSelectedPersons([]);
              }}
              variant="ghost"
              className="gap-2 transition-all"
            >
              <X />
              Borrar selección
            </Button>
          )}
        </div>
        {selectedPersons.length === 0 && (
          <p className="text-sm font-semibold text-destructive py-2">
            Ningún competidor seleccionado. Se exportarán gafetes en blanco.
          </p>
        )}
        <div className="flex justify-end gap-2 w-full">
          <ExportBadgesButtonGroup
            selectedPersons={selectedPersons}
            competition={competition}
            states={states}
            teams={teams}
            wcif={wcif}
            competitionLogoUrl={competitionLogoUrl}
          />
        </div>
      </CardFooter>
    </Card>
  );
}
