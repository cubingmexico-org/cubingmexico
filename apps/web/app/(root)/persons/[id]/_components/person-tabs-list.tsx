"use client";

import { TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { cn } from "@workspace/ui/lib/utils";

export function PersonTabsList({
  showRecordsTab,
  showChampionshipPodiumsTab,
  showStaffCompetitionsTab,
  showUnofficialTab,
}: {
  showRecordsTab: boolean;
  showChampionshipPodiumsTab: boolean;
  showStaffCompetitionsTab: boolean;
  showUnofficialTab: boolean;
}) {
  // Always: results, chart, pr-streaks, podiums, nemesis, map
  const tabCount =
    6 +
    (showRecordsTab ? 1 : 0) +
    (showChampionshipPodiumsTab ? 1 : 0) +
    (showStaffCompetitionsTab ? 1 : 0) +
    (showUnofficialTab ? 1 : 0);

  return (
    <TabsList
      className={cn(
        "flex flex-col h-auto w-full gap-1.5 p-1.5",
        "md:h-10 md:grid",
        tabCount === 2 && "md:grid-cols-2",
        tabCount === 3 && "md:grid-cols-3",
        tabCount === 4 && "md:grid-cols-4",
        tabCount === 5 && "md:grid-cols-5",
        tabCount === 6 && "md:grid-cols-6",
        tabCount === 7 && "md:grid-cols-7",
        tabCount === 8 && "md:grid-cols-8",
        tabCount === 9 && "md:grid-cols-9",
        tabCount >= 10 && "md:grid-cols-10",
      )}
    >
      <TabsTrigger value="results-by-event">Resultados</TabsTrigger>
      <TabsTrigger value="results-chart">Gráfica</TabsTrigger>
      {showRecordsTab && <TabsTrigger value="records">Récords</TabsTrigger>}
      <TabsTrigger value="pr-streaks">Rachas</TabsTrigger>
      <TabsTrigger value="podiums">Podios</TabsTrigger>
      {showChampionshipPodiumsTab && (
        <TabsTrigger value="championship-podiums">
          Podios en Campeonatos
        </TabsTrigger>
      )}
      <TabsTrigger value="nemesis">Némesis</TabsTrigger>
      <TabsTrigger value="map">Mapa</TabsTrigger>
      {showStaffCompetitionsTab && (
        <TabsTrigger value="staff-competitions">Organización</TabsTrigger>
      )}
      {showUnofficialTab && (
        <TabsTrigger value="unofficial">No oficiales</TabsTrigger>
      )}
    </TabsList>
  );
}
