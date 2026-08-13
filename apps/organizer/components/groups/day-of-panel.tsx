"use client";

import { useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import type { WCIF } from "@/types/wcif";
import { PersonTimeline } from "@/components/groups/person-timeline";
import { AssignmentsByGroup } from "@/components/groups/assignments-by-group";
import { ScramblerSchedule } from "@/components/groups/scrambler-schedule";

export function DayOfPanel({
  wcif,
  roundActivityCode,
}: {
  wcif: WCIF;
  roundActivityCode: string;
}) {
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [subTab, setSubTab] = useState("timeline");

  const selectPerson = (wcaUserId: number) => {
    setSelectedPersonId(wcaUserId);
    setSubTab("timeline");
  };

  return (
    <Tabs value={subTab} onValueChange={setSubTab}>
      <TabsList>
        <TabsTrigger value="timeline">Línea de tiempo</TabsTrigger>
        <TabsTrigger value="by-group">Por grupo</TabsTrigger>
        <TabsTrigger value="scramblers">Scramblers</TabsTrigger>
      </TabsList>
      <TabsContent value="timeline" className="mt-4">
        <PersonTimeline
          wcif={wcif}
          selectedWcaUserId={selectedPersonId}
          onSelectPerson={setSelectedPersonId}
        />
      </TabsContent>
      <TabsContent value="by-group" className="mt-4">
        <AssignmentsByGroup
          wcif={wcif}
          roundActivityCode={roundActivityCode}
          onSelectPerson={selectPerson}
        />
      </TabsContent>
      <TabsContent value="scramblers" className="mt-4">
        <ScramblerSchedule wcif={wcif} onSelectPerson={selectPerson} />
      </TabsContent>
    </Tabs>
  );
}
