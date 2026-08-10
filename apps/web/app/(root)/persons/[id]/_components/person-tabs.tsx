"use client";

import { useEffect, useState, useTransition } from "react";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import type { GeoJSONProps } from "react-leaflet";
import { PersonResultsTab } from "./results-tab";
import { PersonResultsChartTab } from "./results-chart-tab";
import { PersonRecordsTab } from "./records-tab";
import { PersonChampionshipPodiumsTab } from "./championship-podiums-tab";
import { PersonPrStreaksTab } from "./pr-streaks-tab";
import { PersonStaffCompetitionsTab } from "./staff-competitions-tab";
import { MapContainer } from "./map-container";
import type {
  PersonChampionshipPodium,
  PersonPrStreaks,
  PersonRecordHistoryEntry,
  PersonResultsByEventGroup,
  PersonResultsEventOption,
  PersonStaffCompetition,
} from "../_lib/queries";
import type { PersonCompetitionLocation } from "../_lib/queries";
import {
  loadPersonChampionshipPodiums,
  loadPersonCompetitionResults,
  loadPersonMapData,
  loadPersonPrStreaks,
  loadPersonRecordHistory,
  loadPersonStaffCompetitions,
} from "../_lib/actions";

const TAB_VALUES = [
  "results-by-event",
  "results-chart",
  "records",
  "pr-streaks",
  "championship-podiums",
  "map",
  "staff-competitions",
] as const;

type TabValue = (typeof TAB_VALUES)[number];

type PersonTabsProps = {
  wcaId: string;
  eventOptions: PersonResultsEventOption[];
  showRecordsTab: boolean;
  showChampionshipPodiumsTab: boolean;
  showStaffCompetitionsTab: boolean;
};

export function PersonTabs({
  wcaId,
  eventOptions,
  showRecordsTab,
  showChampionshipPodiumsTab,
  showStaffCompetitionsTab,
}: PersonTabsProps) {
  const [{ tab, event }, setQuery] = useQueryStates({
    tab: parseAsStringLiteral(TAB_VALUES).withDefault("results-by-event"),
    event: parseAsString.withDefault(eventOptions[0]?.eventId ?? ""),
  });

  const selectedEventId =
    eventOptions.find((option) => option.eventId === event)?.eventId ??
    eventOptions[0]?.eventId ??
    "";

  const [isPending, startTransition] = useTransition();
  const [selectedResults, setSelectedResults] =
    useState<PersonResultsByEventGroup | null>(null);
  const [recordHistory, setRecordHistory] = useState<
    PersonRecordHistoryEntry[] | null
  >(null);
  const [prStreaks, setPrStreaks] = useState<PersonPrStreaks | null>(null);
  const [championshipPodiums, setChampionshipPodiums] = useState<
    PersonChampionshipPodium[] | null
  >(null);
  const [staffCompetitions, setStaffCompetitions] = useState<{
    organized: PersonStaffCompetition[];
    delegated: PersonStaffCompetition[];
  } | null>(null);
  const [mapData, setMapData] = useState<{
    locations: PersonCompetitionLocation[];
    statesData: GeoJSONProps["data"] | undefined;
    visitedStateCount: number;
  } | null>(null);

  useEffect(() => {
    if (
      (tab === "records" && !showRecordsTab) ||
      (tab === "championship-podiums" && !showChampionshipPodiumsTab) ||
      (tab === "staff-competitions" && !showStaffCompetitionsTab)
    ) {
      void setQuery({ tab: "results-by-event" });
    }
  }, [
    tab,
    showRecordsTab,
    showChampionshipPodiumsTab,
    showStaffCompetitionsTab,
    setQuery,
  ]);

  useEffect(() => {
    if (
      (tab !== "results-by-event" && tab !== "results-chart") ||
      !selectedEventId
    ) {
      return;
    }

    let cancelled = false;
    startTransition(() => {
      void loadPersonCompetitionResults(wcaId, selectedEventId).then(
        (results) => {
          if (!cancelled) {
            setSelectedResults(results);
          }
        },
      );
    });

    return () => {
      cancelled = true;
    };
  }, [wcaId, selectedEventId, tab]);

  useEffect(() => {
    if (tab !== "records" || recordHistory !== null) {
      return;
    }

    let cancelled = false;
    startTransition(() => {
      void loadPersonRecordHistory(wcaId).then((history) => {
        if (!cancelled) {
          setRecordHistory(history);
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [tab, wcaId, recordHistory]);

  useEffect(() => {
    if (tab !== "pr-streaks" || prStreaks !== null) {
      return;
    }

    let cancelled = false;
    startTransition(() => {
      void loadPersonPrStreaks(wcaId).then((streaks) => {
        if (!cancelled) {
          setPrStreaks(streaks);
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [tab, wcaId, prStreaks]);

  useEffect(() => {
    if (
      tab !== "championship-podiums" ||
      !showChampionshipPodiumsTab ||
      championshipPodiums !== null
    ) {
      return;
    }

    let cancelled = false;
    startTransition(() => {
      void loadPersonChampionshipPodiums(wcaId).then((podiums) => {
        if (!cancelled) {
          setChampionshipPodiums(podiums);
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [tab, wcaId, championshipPodiums, showChampionshipPodiumsTab]);

  useEffect(() => {
    if (
      tab !== "staff-competitions" ||
      !showStaffCompetitionsTab ||
      staffCompetitions !== null
    ) {
      return;
    }

    let cancelled = false;
    startTransition(() => {
      void loadPersonStaffCompetitions(wcaId).then((staff) => {
        if (!cancelled) {
          setStaffCompetitions(staff);
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [tab, wcaId, staffCompetitions, showStaffCompetitionsTab]);

  useEffect(() => {
    if (tab !== "map" || mapData !== null) {
      return;
    }

    let cancelled = false;
    startTransition(() => {
      void loadPersonMapData(wcaId).then((data) => {
        if (!cancelled) {
          setMapData({
            locations: data.locations,
            statesData: data.statesData as GeoJSONProps["data"] | undefined,
            visitedStateCount: data.visitedStateCount,
          });
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [tab, wcaId, mapData]);

  const hasStaffCompetitions =
    staffCompetitions !== null &&
    (staffCompetitions.organized.length > 0 ||
      staffCompetitions.delegated.length > 0);

  // Always: results, chart, pr-streaks, map
  const tabCount =
    4 +
    (showRecordsTab ? 1 : 0) +
    (showChampionshipPodiumsTab ? 1 : 0) +
    (showStaffCompetitionsTab ? 1 : 0);

  function selectTab(nextTab: TabValue) {
    void setQuery({ tab: nextTab });
  }

  function selectEvent(eventId: string) {
    void setQuery({ event: eventId });
  }

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => selectTab(value as TabValue)}
      className="mt-6"
    >
      <TabsList
        className={cn(
          "flex flex-col h-auto w-full gap-1.5 p-1.5",
          "md:h-10 md:grid",
          tabCount === 2 && "md:grid-cols-2",
          tabCount === 3 && "md:grid-cols-3",
          tabCount === 4 && "md:grid-cols-4",
          tabCount === 5 && "md:grid-cols-5",
          tabCount === 6 && "md:grid-cols-6",
          tabCount >= 7 && "md:grid-cols-7",
        )}
      >
        <TabsTrigger value="results-by-event">Resultados</TabsTrigger>
        <TabsTrigger value="results-chart">Gráfica</TabsTrigger>
        {showRecordsTab && <TabsTrigger value="records">Récords</TabsTrigger>}
        <TabsTrigger value="pr-streaks">Rachas</TabsTrigger>
        {showChampionshipPodiumsTab && (
          <TabsTrigger value="championship-podiums">
            Podios en Campeonatos
          </TabsTrigger>
        )}
        <TabsTrigger value="map">Mapa</TabsTrigger>
        {showStaffCompetitionsTab && (
          <TabsTrigger value="staff-competitions">Organización</TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="results-by-event" className="mt-6">
        {isPending && !selectedResults ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <PersonResultsTab
            eventOptions={eventOptions}
            selectedEventId={selectedEventId}
            selectedResults={selectedResults}
            onEventSelect={selectEvent}
          />
        )}
      </TabsContent>

      <TabsContent value="results-chart" className="mt-6">
        {isPending && !selectedResults ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <PersonResultsChartTab
            eventOptions={eventOptions}
            selectedEventId={selectedEventId}
            selectedResults={selectedResults}
            onEventSelect={selectEvent}
          />
        )}
      </TabsContent>

      {showRecordsTab && (
        <TabsContent value="records" className="mt-6">
          {recordHistory === null ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <PersonRecordsTab records={recordHistory} />
          )}
        </TabsContent>
      )}

      <TabsContent value="pr-streaks" className="mt-6">
        {prStreaks === null ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <PersonPrStreaksTab streaks={prStreaks} />
        )}
      </TabsContent>

      {showChampionshipPodiumsTab && (
        <TabsContent value="championship-podiums" className="mt-6">
          {championshipPodiums === null ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <PersonChampionshipPodiumsTab podiums={championshipPodiums} />
          )}
        </TabsContent>
      )}

      <TabsContent value="map" className="mt-6">
        {mapData === null ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            <h2 className="flex items-center justify-center gap-2 text-lg font-semibold my-4">
              <span>Estados visitados</span>
              <Badge>{mapData.visitedStateCount}</Badge>
            </h2>
            <MapContainer
              locations={mapData.locations}
              statesData={mapData.statesData as GeoJSONProps["data"]}
            />
          </>
        )}
      </TabsContent>

      {showStaffCompetitionsTab && (
        <TabsContent value="staff-competitions" className="mt-6">
          {staffCompetitions === null ? (
            <Skeleton className="h-64 w-full" />
          ) : hasStaffCompetitions ? (
            <PersonStaffCompetitionsTab
              organized={staffCompetitions.organized}
              delegated={staffCompetitions.delegated}
            />
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              Esta persona no ha organizado ni delegado competencias.
            </p>
          )}
        </TabsContent>
      )}
    </Tabs>
  );
}
