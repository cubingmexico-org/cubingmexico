import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@workspace/ui/components/table";
import Image from "next/image";
import { getEvents, getPerson } from "@/db/queries";
import { getTier } from "@/lib/utils";
import { StateLabel } from "@/components/state-flag";
import Link from "next/link";
import type { Metadata } from "next";
import { WcaMonochrome } from "@workspace/icons";
import {
  getPersonData,
  getOrganizerStatus,
  getMembershipData,
  getPersonCompetitionEventOptions,
  getPersonCompetitionResults,
  getPersonAvatarFromWCA,
  hasPersonChampionshipPodiums,
  hasPersonStaffCompetitions,
  hasPersonUnofficialResults,
  getPersonUnofficialPrs,
  getPersonUnofficialHonors,
} from "./_lib/queries";
import { notFound, permanentRedirect } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import { PersonTabs } from "./_components/person-tabs";
import { PersonBadges } from "./_components/person-badges";
import { PersonalRecordsTable } from "./_components/personal-records-table";
import { PersonSummaryTables } from "./_components/person-summary-tables";
import {
  UnofficialHonorsTables,
  UnofficialPrsTable,
} from "./_components/unofficial-prs-table";
import { getPersonNemesisStats } from "../_lib/nemesis-queries";
import { DeprecatedEventsSwitch } from "@/components/deprecated-events-switch";
import { eventScopeFromDeprecated } from "@/lib/official-events";
import type { EventScope } from "@/lib/constants";
import { deprecatedParser } from "@/lib/search-params";
import { createSearchParamsCache } from "nuqs/server";
import type { SearchParams } from "@/types";

const searchParamsCache = createSearchParamsCache({
  deprecated: deprecatedParser,
});

type Props = {
  params: Promise<{ id: string }>;
};

type PageProps = Props & {
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = (await params).id.toUpperCase();

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
  scope,
}: {
  id: string;
  scope: EventScope;
}) {
  "use cache";
  cacheLife("days");
  cacheTag(`person-page-${id}`);

  const [events, officialEvents] = await Promise.all([
    getEvents(scope),
    getEvents(),
  ]);

  const [
    wcaData,
    personData,
    organizerStatus,
    membershipData,
    eventOptions,
    showChampionshipPodiumsTab,
    showStaffCompetitionsTab,
    nemesisStats,
    showUnofficialTab,
    unofficialPrs,
    unofficialHonors,
  ] = await Promise.all([
    getPersonAvatarFromWCA(id),
    getPersonData(id, scope),
    getOrganizerStatus(id),
    getMembershipData(
      id,
      officialEvents.map((event) => event.id),
    ),
    getPersonCompetitionEventOptions(id),
    hasPersonChampionshipPodiums(id),
    hasPersonStaffCompetitions(id),
    getPersonNemesisStats(id, scope),
    hasPersonUnofficialResults(id),
    getPersonUnofficialPrs(id),
    getPersonUnofficialHonors(id),
  ]);

  if (!personData) {
    notFound();
  }

  // The tabs open on the first event; render its results with the page instead of after hydration.
  const defaultEventId = eventOptions[0]?.eventId;
  const initialResults = defaultEventId
    ? {
        eventId: defaultEventId,
        results: await getPersonCompetitionResults(id, defaultEventId),
      }
    : null;

  const {
    person,
    team,
    competitionCount,
    personalRecords,
    medals,
    regionalRecords,
  } = personData;
  const showRecordsTab =
    regionalRecords.total > 0 || (regionalRecords.state ?? 0) > 0;

  return (
    <>
      <h1 className="text-center font-semibold text-2xl mb-4">
        {person.name ?? id}
      </h1>
      <PersonBadges
        wcaId={id}
        person={person}
        team={team}
        tier={getTier(membershipData)}
        organizerStatus={organizerStatus}
        nemesisStats={nemesisStats}
      />
      {wcaData && (
        <div className="w-full flex justify-center mb-6">
          <Image
            src={wcaData.person.avatar.url}
            alt="Avatar"
            width={wcaData.person.avatar.is_default ? 100 : 300}
            height={wcaData.person.avatar.is_default ? 100 : 300}
            className="rounded"
          />
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center">Estado</TableHead>
            <TableHead className="text-center">WCA ID</TableHead>
            <TableHead className="text-center">Sexo</TableHead>
            <TableHead className="text-center">Competencias</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="text-center">
              {person.state ? (
                <StateLabel
                  stateName={person.state}
                  className="justify-center"
                />
              ) : (
                <span className="text-muted-foreground font-thin">N/A</span>
              )}
            </TableCell>
            <TableCell className="text-center">
              <Link
                href={`https://www.worldcubeassociation.org/persons/${id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 text-link hover:text-link/80"
              >
                <WcaMonochrome className="size-4" />
                {person.wcaId}
              </Link>
            </TableCell>
            <TableCell className="text-center">
              {person.gender === "m"
                ? "Masculino"
                : person.gender === "f"
                  ? "Femenino"
                  : "Otro"}
            </TableCell>
            <TableCell className="text-center">{competitionCount}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <h2 className="text-center text-lg font-semibold my-4">
        Récords personales actuales
      </h2>
      <div className="flex justify-center mb-4">
        <DeprecatedEventsSwitch />
      </div>
      <PersonalRecordsTable
        events={events}
        personalRecords={personalRecords}
        showStateRank={Boolean(person.state)}
      />
      {unofficialPrs.length > 0 && (
        <UnofficialPrsTable
          wcaId={id}
          prs={unofficialPrs}
          showStateRank={Boolean(person.state)}
        />
      )}
      <PersonSummaryTables medals={medals} regionalRecords={regionalRecords} />
      {showUnofficialTab && (
        <UnofficialHonorsTables honors={unofficialHonors} />
      )}
      <PersonTabs
        wcaId={id}
        personName={person.name ?? id}
        eventOptions={eventOptions}
        initialResults={initialResults}
        showRecordsTab={showRecordsTab}
        showChampionshipPodiumsTab={showChampionshipPodiumsTab}
        showStaffCompetitionsTab={showStaffCompetitionsTab}
        showUnofficialTab={showUnofficialTab}
      />
    </>
  );
}

export default async function Page({ params, searchParams }: PageProps) {
  const id = (await params).id;
  const wcaId = id.toUpperCase();

  if (wcaId !== id) {
    permanentRedirect(`/persons/${wcaId}`);
  }

  const { deprecated } = searchParamsCache.parse(await searchParams);

  return (
    <PersonPageContent
      id={wcaId}
      scope={eventScopeFromDeprecated(deprecated)}
    />
  );
}
