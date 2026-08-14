"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import type { State } from "@/db/queries";
import type { Competition } from "@/types/wca";
import type { ExtendedPerson } from "@/types/wcif";
import { RegistrationOverview } from "./registration-overview";
import { StaffRoster } from "./staff-roster";

export function DeskManager({
  competition,
  persons,
  states,
}: {
  competition: Competition;
  persons: ExtendedPerson[];
  states: State[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {competition.name}
        </h1>
        <p className="text-muted-foreground">
          Mesa de operaciones — staff e inscripciones (solo lectura)
        </p>
      </div>

      <Tabs defaultValue="staff">
        <TabsList>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="registration">Inscripciones</TabsTrigger>
        </TabsList>
        <TabsContent value="staff" className="mt-4">
          <StaffRoster
            persons={persons}
            states={states}
            competitionId={competition.id}
          />
        </TabsContent>
        <TabsContent value="registration" className="mt-4">
          <RegistrationOverview
            persons={persons}
            states={states}
            competitionId={competition.id}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
