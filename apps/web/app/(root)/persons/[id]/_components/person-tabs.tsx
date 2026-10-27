"use client";

import { useEffect, useState, useTransition } from "react";
import {
  parseAsBoolean,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
  useQueryStates,
} from "nuqs";
import { Tabs, TabsContent } from "@workspace/ui/components/tabs";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import type { GeoJSONProps } from "react-leaflet";
import { PersonTabsList } from "./person-tabs-list";
import { useTabData } from "./use-tab-data";
import { PersonResultsTab } from "./results-tab";
import { PersonResultsChartTab } from "./results-chart-tab";
import { PersonRecordsTab } from "./records-tab";
import { PersonChampionshipPodiumsTab } from "./championship-podiums-tab";
import { PersonPrStreaksTab } from "./pr-streaks-tab";
import { PersonPodiumsTab } from "./podiums-tab";
import { PersonStaffCompetitionsTab } from "./staff-competitions-tab";
import { PersonUnofficialTab } from "./unofficial-tab";
import { MapContainer } from "./map-container";
import type {
  PersonResultsByEventGroup,
  PersonResultsEventOption,
} from "../_lib/queries";
import { NemesesList } from "../../_components/nemeses-list";
import { NemesizedList } from "../../_components/nemesized-list";
import {
  loadPersonChampionshipPodiums,
  loadPersonCompetitionResults,
  loadPersonMapData,
  loadPersonNemeses,
  loadPersonPodiumsByEvent,
  loadPersonPrStreaks,
  loadPersonRecordHistory,
  loadPersonStaffCompetitions,
  loadPersonUnofficialPodiums,
  loadPersonUnofficialResults,
} from "../_lib/actions";

const TAB_VALUES = [
  "results-by-event",
  "results-chart",
  "records",
  "pr-streaks",
  "podiums",
  "championship-podiums",
  "nemesis",
  "map",
  "staff-competitions",
  "unofficial",
] as const;

type TabValue = (typeof TAB_VALUES)[number];

type LoadedEventResults = {
  eventId: string;
  results: PersonResultsByEventGroup | null;
};

type PersonTabsProps = {
  wcaId: string;
  personName: string;
  eventOptions: PersonResultsEventOption[];
  /** Results for the default event, rendered with the page. */
  initialResults: LoadedEventResults | null;
  showRecordsTab: boolean;
  showChampionshipPodiumsTab: boolean;
  showStaffCompetitionsTab: boolean;
  showUnofficialTab: boolean;
};

export function PersonTabs({
  wcaId,
  personName,
  eventOptions,
  initialResults,
  showRecordsTab,
  showChampionshipPodiumsTab,
  showStaffCompetitionsTab,
  showUnofficialTab,
}: PersonTabsProps) {
  const [{ tab, event, ccEvent }, setQuery] = useQueryStates({
    tab: parseAsStringLiteral(TAB_VALUES).withDefault("results-by-event"),
    event: parseAsString.withDefault(eventOptions[0]?.eventId ?? ""),
    ccEvent: parseAsString,
  });

  const selectedEventId =
    eventOptions.find((option) => option.eventId === event)?.eventId ??
    eventOptions[0]?.eventId ??
    "";

  const [isPending, startTransition] = useTransition();
  const [loadedResults, setLoadedResults] = useState(initialResults);
  const selectedResults = loadedResults?.results ?? null;
  const loadedEventId = loadedResults?.eventId;
  const [includeDeprecated] = useQueryState(
    "deprecated",
    parseAsBoolean.withDefault(false),
  );

  const recordHistory = useTabData(tab === "records", wcaId, () =>
    loadPersonRecordHistory(wcaId),
  );
  const prStreaks = useTabData(tab === "pr-streaks", wcaId, () =>
    loadPersonPrStreaks(wcaId),
  );
  const podiumsByEvent = useTabData(tab === "podiums", wcaId, () =>
    loadPersonPodiumsByEvent(wcaId),
  );
  const unofficialPodiums = useTabData(
    tab === "podiums" && showUnofficialTab,
    wcaId,
    () => loadPersonUnofficialPodiums(wcaId),
  );
  const championshipPodiums = useTabData(
    tab === "championship-podiums" && showChampionshipPodiumsTab,
    wcaId,
    () => loadPersonChampionshipPodiums(wcaId),
  );
  const staffCompetitions = useTabData(
    tab === "staff-competitions" && showStaffCompetitionsTab,
    wcaId,
    () => loadPersonStaffCompetitions(wcaId),
  );
  const nemeses = useTabData(
    tab === "nemesis",
    `${wcaId}:${includeDeprecated}`,
    () => loadPersonNemeses(wcaId, includeDeprecated),
  );
  const mapData = useTabData(tab === "map", wcaId, async () => {
    const data = await loadPersonMapData(wcaId);
    return {
      ...data,
      statesData: data.statesData as GeoJSONProps["data"] | undefined,
    };
  });
  const unofficialResults = useTabData(
    tab === "unofficial" && showUnofficialTab,
    wcaId,
    () => loadPersonUnofficialResults(wcaId),
  );

  useEffect(() => {
    if (
      (tab === "records" && !showRecordsTab) ||
      (tab === "championship-podiums" && !showChampionshipPodiumsTab) ||
      (tab === "staff-competitions" && !showStaffCompetitionsTab) ||
      (tab === "unofficial" && !showUnofficialTab)
    ) {
      void setQuery({ tab: "results-by-event" });
    }
  }, [
    tab,
    showRecordsTab,
    showChampionshipPodiumsTab,
    showStaffCompetitionsTab,
    showUnofficialTab,
    setQuery,
  ]);

  useEffect(() => {
    if (
      (tab !== "results-by-event" && tab !== "results-chart") ||
      !selectedEventId ||
      loadedEventId === selectedEventId
    ) {
      return;
    }

    let cancelled = false;
    startTransition(() => {
      void loadPersonCompetitionResults(wcaId, selectedEventId).then(
        (results) => {
          if (!cancelled) {
            setLoadedResults({ eventId: selectedEventId, results });
          }
        },
      );
    });

    return () => {
      cancelled = true;
    };
  }, [wcaId, selectedEventId, tab, loadedEventId]);

  const hasStaffCompetitions =
    staffCompetitions !== null &&
    (staffCompetitions.organized.length > 0 ||
      staffCompetitions.delegated.length > 0);

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
      <PersonTabsList
        showRecordsTab={showRecordsTab}
        showChampionshipPodiumsTab={showChampionshipPodiumsTab}
        showStaffCompetitionsTab={showStaffCompetitionsTab}
        showUnofficialTab={showUnofficialTab}
      />

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

      <TabsContent value="podiums" className="mt-6">
        {podiumsByEvent === null ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="flex flex-col gap-6">
            <PersonPodiumsTab podiums={podiumsByEvent} />
            {unofficialPodiums && unofficialPodiums.length > 0 && (
              <PersonPodiumsTab
                podiums={unofficialPodiums}
                variant="unofficial"
                title="Podios no oficiales por evento"
              />
            )}
          </div>
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

      <TabsContent value="nemesis" className="mt-6">
        {nemeses === null ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="flex flex-col gap-8">
            <NemesesList
              targetWcaId={wcaId}
              targetName={personName}
              report={nemeses.report}
            />
            <NemesizedList
              targetWcaId={wcaId}
              targetName={personName}
              report={nemeses.nemesized}
            />
          </div>
        )}
      </TabsContent>

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

      {showUnofficialTab && (
        <TabsContent value="unofficial" className="mt-6">
          {unofficialResults === null ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <PersonUnofficialTab
              wcaId={wcaId}
              groups={unofficialResults}
              selectedEventId={ccEvent}
              onEventSelect={(eventId) => void setQuery({ ccEvent: eventId })}
            />
          )}
        </TabsContent>
      )}
    </Tabs>
  );
}
