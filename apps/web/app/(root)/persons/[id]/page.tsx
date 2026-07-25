/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@workspace/ui/components/table";
import Image from "next/image";
import { getEvents, getPerson, getStatesGeoJSON } from "@/db/queries";
import {
  formatTime,
  formatTime333mbf,
  getTier,
  getTierClass,
} from "@/lib/utils";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { Badge } from "@workspace/ui/components/badge";
import type { GeoJSONProps } from "react-leaflet";
import Link from "next/link";
import type { Metadata } from "next";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { MapContainer } from "./_components/map-container";
import { PersonResultsTab } from "./_components/results-tab";
import { PersonStaffCompetitionsTab } from "./_components/staff-competitions-tab";
import {
  getPersonData,
  getOrganizerStatus,
  getMembershipData,
  getPersonCompetitionEventOptions,
  getPersonCompetitionLocations,
  getPersonCompetitionResults,
  getPersonDataFromWCA,
  getPersonStaffCompetitions,
  getPersonRecordHistory,
  getPersonChampionshipPodiums,
} from "./_lib/queries";
import type { PersonalRecordWithStateRank } from "./_lib/queries";
import { PersonRecordsTab } from "./_components/records-tab";
import { PersonChampionshipPodiumsTab } from "./_components/championship-podiums-tab";
import { notFound } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import { formatDelegateLevel } from "@/lib/delegate-level";
import type { SearchParams } from "@/types";
import { PersonResultsChartTab } from "./_components/results-chart-tab";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = (await params).id;

  const person = await getPerson(id);

  if (!person) {
    return {
      title: "Persona no encontrada | Cubing México",
      description: "La persona solicitada no existe.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: `${person.name} | Cubing México`,
    description: `Resultados de ${person.name}`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

async function PersonPageContent({
  id,
  searchParams,
}: {
  id: string;
  searchParams: Promise<SearchParams>;
}) {
  "use cache";
  cacheLife("days");
  cacheTag(`person-page-${id}`);

  const events = await getEvents();
  const queryParams = await searchParams;
  const requestedEventId = Array.isArray(queryParams.event)
    ? queryParams.event[0]
    : queryParams.event;
  const selectedTab = (() => {
    const raw = Array.isArray(queryParams.tab)
      ? queryParams.tab[0]
      : queryParams.tab;
    const valid = [
      "results-by-event",
      "results-chart",
      "records",
      "championship-podiums",
      "map",
      "staff-competitions",
    ];
    return valid.includes(raw ?? "")
      ? (raw ?? "results-by-event")
      : "results-by-event";
  })();

  const wcaData = await getPersonDataFromWCA(id);

  if (!wcaData) {
    notFound();
  }

  const [
    personData,
    organizerStatus,
    membershipData,
    eventOptions,
    locations,
    statesData,
    staffCompetitions,
    recordHistory,
    championshipPodiums,
  ] = await Promise.all([
    getPersonData(id),
    getOrganizerStatus(id),
    getMembershipData(
      id,
      events.map((event) => event.id),
    ),
    getPersonCompetitionEventOptions(id),
    getPersonCompetitionLocations(id),
    getStatesGeoJSON(),
    getPersonStaffCompetitions(id),
    getPersonRecordHistory(id),
    getPersonChampionshipPodiums(id),
  ]);

  if (!personData) {
    notFound();
  }

  const { person, competitionCount, personalRecords, medals, regionalRecords } =
    personData;
  const { organized, delegated } = staffCompetitions;
  const hasStaffCompetitions = organized.length > 0 || delegated.length > 0;
  const isOrganizer = organizerStatus !== null;
  const hasRecords = regionalRecords.total > 0;
  const hasPodiums = championshipPodiums.length > 0;
  const tabCount =
    3 +
    (hasRecords ? 1 : 0) +
    (hasPodiums ? 1 : 0) +
    (hasStaffCompetitions ? 1 : 0);

  const stateIds = locations
    .map((location) => location.stateId)
    .filter((stateId): stateId is string => stateId !== null);

  const filteredStatesData = statesData?.features.filter((feature) =>
    stateIds?.includes(feature.properties.id),
  ) as unknown as GeoJSONProps["data"];

  const visitedStateCount = new Set(stateIds).size;

  const filteredLocations = locations.filter((location) => {
    const latitude = location.latitude ?? 0;
    const longitude = location.longitude ?? 0;

    return latitude !== 0 && longitude !== 0;
  });

  const isDelegate = person.delegateStatus !== null;

  const tier = getTier(membershipData);
  const selectedEventId =
    eventOptions.find((e) => e.eventId === requestedEventId)?.eventId ??
    eventOptions[0]?.eventId ??
    "";

  const selectedResults = selectedEventId
    ? await getPersonCompetitionResults(id, selectedEventId)
    : null;

  const records = events.reduce<
    Array<{ event: string; record: PersonalRecordWithStateRank }>
  >((accumulator, event) => {
    const personalRecord = personalRecords[event.id];
    if (!personalRecord) {
      return accumulator;
    }

    accumulator.push({
      event: event.id,
      record: personalRecord,
    });
    return accumulator;
  }, []);

  const SRcount = records.reduce((total, record) => {
    const singleRank = record.record.single?.stateRank === 1 ? 1 : 0;
    const averageRank = record.record.average?.stateRank === 1 ? 1 : 0;

    return total + singleRank + averageRank;
  }, 0);

  return (
    <>
      <h1 className="text-center font-semibold text-2xl mb-4 hover:underline">
        <Link
          href={`https://www.worldcubeassociation.org/persons/${id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {person.name ?? id}
        </Link>
      </h1>
      <div className="w-full flex justify-center gap-2 mb-2">
        {tier && <Badge className={getTierClass(tier)}>Miembro {tier}</Badge>}
        {isDelegate && (
          <Badge>
            {formatDelegateLevel(person.delegateStatus, person.gender)}
          </Badge>
        )}
        {isOrganizer && organizerStatus && (
          <Badge variant="outline">
            Organizador{person.gender === "f" ? "a" : ""}{" "}
            {organizerStatus.level}
          </Badge>
        )}
      </div>
      <div className="w-full flex justify-center mb-6">
        <Image
          src={wcaData?.person.avatar.url}
          alt="Avatar"
          width={wcaData.person.avatar.is_default ? 100 : 300}
          height={wcaData.person.avatar.is_default ? 100 : 300}
          className="rounded"
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center">Estado</TableHead>
            <TableHead className="text-center">WCA ID</TableHead>
            <TableHead className="text-center">Sexo</TableHead>
            <TableHead className="text-center">Competencias</TableHead>
            {/* <TableHead className="text-center">Resoluciones</TableHead> */}
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="text-center">
              {person.state ?? (
                <span className="text-muted-foreground font-thin">N/A</span>
              )}
            </TableCell>
            <TableCell className="text-center">{person.wcaId}</TableCell>
            <TableCell className="text-center">
              {person.gender === "m"
                ? "Masculino"
                : person.gender === "f"
                  ? "Femenino"
                  : "Otro"}
            </TableCell>
            <TableCell className="text-center">{competitionCount}</TableCell>
            {/* <TableCell className="text-center">{solveCount}</TableCell> */}
          </TableRow>
        </TableBody>
      </Table>
      <h2 className="text-center text-lg font-semibold my-4">
        Récords personales actuales
      </h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Evento</TableHead>
            {person.state && <TableHead className="text-center">SR</TableHead>}
            <TableHead className="text-center">NR</TableHead>
            <TableHead className="text-center">CR</TableHead>
            <TableHead className="text-center">WR</TableHead>
            <TableHead className="text-center">Single</TableHead>
            <TableHead className="text-center">Average</TableHead>
            <TableHead className="text-center">WR</TableHead>
            <TableHead className="text-center">CR</TableHead>
            <TableHead className="text-center">NR</TableHead>
            {person.state && <TableHead className="text-center">SR</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.event}>
              <TableCell>
                <span
                  key={record.event}
                  className={`cubing-icon event-${record.event}`}
                />
                <span className="ml-2">
                  {events.find((e) => e.id === record.event)?.name}
                </span>
              </TableCell>
              {person.state && (
                <TableCell
                  className={cn(
                    "text-center",
                    record?.record?.single.stateRank === 1 &&
                      "font-semibold text-blue-700",
                  )}
                >
                  {record?.record?.single.stateRank === 0 ||
                  record?.record?.single.stateRank === null ? (
                    <span className="text-muted-foreground font-thin">N/A</span>
                  ) : (
                    record?.record?.single.stateRank
                  )}
                </TableCell>
              )}
              <TableCell
                className={cn(
                  "text-center",
                  record?.record?.single.countryRank === 1 &&
                    "font-semibold text-blue-700",
                )}
              >
                {record?.record?.single.countryRank === 0 ||
                record?.record?.single.countryRank === null ? (
                  <span className="text-muted-foreground font-thin">N/A</span>
                ) : (
                  record?.record?.single.countryRank
                )}
              </TableCell>
              <TableCell
                className={cn(
                  "text-center",
                  record?.record?.single.continentRank === 1 &&
                    "font-semibold text-blue-700",
                )}
              >
                {record?.record?.single.continentRank === 0 ||
                record?.record?.single.continentRank === null ? (
                  <span className="text-muted-foreground font-thin">N/A</span>
                ) : (
                  record?.record?.single.continentRank
                )}
              </TableCell>
              <TableCell
                className={cn(
                  "text-center",
                  record?.record?.single.worldRank === 1 &&
                    "font-semibold text-blue-700",
                )}
              >
                {record?.record?.single.worldRank === 0 ||
                record?.record?.single.worldRank === null ? (
                  <span className="text-muted-foreground font-thin">N/A</span>
                ) : (
                  record?.record?.single.worldRank
                )}
              </TableCell>
              <TableCell className="text-center font-semibold">
                {record.event === "333mbf"
                  ? formatTime333mbf(record?.record?.single.best!)
                  : record.event === "333fm"
                    ? record?.record?.single.best
                    : formatTime(record?.record?.single.best!)}
              </TableCell>
              <TableCell className="text-center font-semibold">
                {record?.record?.average?.best
                  ? formatTime(record?.record?.average?.best)
                  : null}
              </TableCell>
              <TableCell
                className={cn(
                  "text-center",
                  record?.record?.average?.worldRank === 1 &&
                    "font-semibold text-blue-700",
                )}
              >
                {record?.record?.average?.worldRank === 0 ||
                record?.record?.average?.worldRank === null ? (
                  <span className="text-muted-foreground font-thin">N/A</span>
                ) : (
                  record?.record?.average?.worldRank
                )}
              </TableCell>
              <TableCell
                className={cn(
                  "text-center",
                  record?.record?.average?.continentRank === 1 &&
                    "font-semibold text-blue-700",
                )}
              >
                {record?.record?.average?.continentRank === 0 ||
                record?.record?.average?.continentRank === null ? (
                  <span className="text-muted-foreground font-thin">N/A</span>
                ) : (
                  record?.record?.average?.continentRank
                )}
              </TableCell>
              <TableCell
                className={cn(
                  "text-center",
                  record?.record?.average?.countryRank === 1 &&
                    "font-semibold text-blue-700",
                )}
              >
                {record?.record?.average?.countryRank === 0 ||
                record?.record?.average?.countryRank === null ? (
                  <span className="text-muted-foreground font-thin">N/A</span>
                ) : (
                  record?.record?.average?.countryRank
                )}
              </TableCell>
              {person.state && (
                <TableCell
                  className={cn(
                    "text-center",
                    record?.record?.average?.stateRank === 1 &&
                      "font-semibold text-blue-700",
                  )}
                >
                  {record?.record?.average?.stateRank === 0 ||
                  record?.record?.average?.stateRank === null ? (
                    <span className="text-muted-foreground font-thin">N/A</span>
                  ) : (
                    record?.record?.average?.stateRank
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="grid md:grid-cols-2 grid-cols-1 gap-4 mt-6">
        <div>
          <h3 className="text-center font-semibold mb-2">Medallas</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">Oro</TableHead>
                <TableHead className="text-center">Plata</TableHead>
                <TableHead className="text-center">Bronce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="text-center">{medals.gold}</TableCell>
                <TableCell className="text-center">{medals.silver}</TableCell>
                <TableCell className="text-center">{medals.bronze}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div>
          <h3 className="text-center font-semibold mb-2">Récords</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">WR</TableHead>
                <TableHead className="text-center">CR</TableHead>
                <TableHead className="text-center">NR</TableHead>
                <TableHead className="flex items-center gap-2 justify-center">
                  SR
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="size-4" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Récords actuales, no histórico</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="text-center">
                  {regionalRecords.world}
                </TableCell>
                <TableCell className="text-center">
                  {regionalRecords.continental}
                </TableCell>
                <TableCell className="text-center">
                  {regionalRecords.national}
                </TableCell>
                <TableCell className="text-center">{SRcount}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
      <Tabs value={selectedTab} className="mt-6">
        <TabsList
          className={cn(
            "flex flex-col h-auto w-full gap-1.5 p-1.5",
            "md:h-10 md:grid",
            tabCount === 2 && "md:grid-cols-2",
            tabCount === 3 && "md:grid-cols-3",
            tabCount === 4 && "md:grid-cols-4",
            tabCount === 5 && "md:grid-cols-5",
            tabCount >= 6 && "md:grid-cols-6",
          )}
        >
          <TabsTrigger value="results-by-event" asChild>
            <Link
              href={
                selectedEventId
                  ? `?tab=results-by-event&event=${selectedEventId}`
                  : "?tab=results-by-event"
              }
            >
              Resultados
            </Link>
          </TabsTrigger>
          <TabsTrigger value="results-chart" asChild>
            <Link
              href={
                selectedEventId
                  ? `?tab=results-chart&event=${selectedEventId}`
                  : "?tab=results-chart"
              }
            >
              Gráfica
            </Link>
          </TabsTrigger>
          {hasRecords && (
            <TabsTrigger value="records" asChild>
              <Link
                href={
                  selectedEventId
                    ? `?tab=records&event=${selectedEventId}`
                    : "?tab=records"
                }
              >
                Récords
              </Link>
            </TabsTrigger>
          )}
          {hasPodiums && (
            <TabsTrigger value="championship-podiums" asChild>
              <Link
                href={
                  selectedEventId
                    ? `?tab=championship-podiums&event=${selectedEventId}`
                    : "?tab=championship-podiums"
                }
              >
                Podios en Campeonatos
              </Link>
            </TabsTrigger>
          )}
          <TabsTrigger value="map" asChild>
            <Link
              href={
                selectedEventId
                  ? `?tab=map&event=${selectedEventId}`
                  : "?tab=map"
              }
            >
              Mapa
            </Link>
          </TabsTrigger>
          {hasStaffCompetitions && (
            <TabsTrigger value="staff-competitions" asChild>
              <Link
                href={
                  selectedEventId
                    ? `?tab=staff-competitions&event=${selectedEventId}`
                    : "?tab=staff-competitions"
                }
              >
                Organización
              </Link>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="results-by-event" className="mt-6">
          <PersonResultsTab
            eventOptions={eventOptions}
            selectedEventId={selectedEventId}
            selectedResults={selectedResults}
          />
        </TabsContent>

        <TabsContent value="results-chart" className="mt-6">
          <PersonResultsChartTab
            eventOptions={eventOptions}
            selectedEventId={selectedEventId}
            selectedResults={selectedResults}
          />
        </TabsContent>

        {hasRecords && (
          <TabsContent value="records" className="mt-6">
            <PersonRecordsTab records={recordHistory} />
          </TabsContent>
        )}

        {hasPodiums && (
          <TabsContent value="championship-podiums" className="mt-6">
            <PersonChampionshipPodiumsTab podiums={championshipPodiums} />
          </TabsContent>
        )}

        <TabsContent value="map" className="mt-6">
          <h2 className="flex items-center justify-center gap-2 text-lg font-semibold my-4">
            <span>Estados visitados</span>
            <Badge>{visitedStateCount}</Badge>
          </h2>
          <MapContainer
            locations={filteredLocations}
            statesData={filteredStatesData}
          />
        </TabsContent>

        {hasStaffCompetitions && (
          <TabsContent value="staff-competitions" className="mt-6">
            <PersonStaffCompetitionsTab
              organized={organized}
              delegated={delegated}
            />
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const id = (await params).id;

  return <PersonPageContent id={id} searchParams={searchParams} />;
}
