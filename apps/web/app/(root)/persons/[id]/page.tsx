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
import { getEvents, getPerson } from "@/db/queries";
import {
  formatTime,
  formatTime333mbf,
  getTier,
  getTierClass,
} from "@/lib/utils";
import { cn } from "@workspace/ui/lib/utils";
import { Badge } from "@workspace/ui/components/badge";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getPersonData,
  getOrganizerStatus,
  getMembershipData,
  getPersonCompetitionEventOptions,
  getPersonDataFromWCA,
  hasPersonChampionshipPodiums,
  hasPersonStaffCompetitions,
} from "./_lib/queries";
import type { PersonalRecordWithStateRank } from "./_lib/queries";
import { getLatestSummaryYear } from "@/app/(root)/summary/[year]/[wcaId]/_lib/queries";
import { notFound } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import { formatDelegateLevel } from "@/lib/delegate-level";
import { PersonTabs } from "./_components/person-tabs";

type Props = {
  params: Promise<{ id: string }>;
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

async function PersonPageContent({ id }: { id: string }) {
  "use cache";
  cacheLife("days");
  cacheTag(`person-page-${id}`);

  const events = await getEvents();
  const wcaData = await getPersonDataFromWCA(id);

  if (!wcaData) {
    notFound();
  }

  const [
    personData,
    organizerStatus,
    membershipData,
    eventOptions,
    showChampionshipPodiumsTab,
    showStaffCompetitionsTab,
    latestSummaryYear,
  ] = await Promise.all([
    getPersonData(id),
    getOrganizerStatus(id),
    getMembershipData(
      id,
      events.map((event) => event.id),
    ),
    getPersonCompetitionEventOptions(id),
    hasPersonChampionshipPodiums(id),
    hasPersonStaffCompetitions(id),
    getLatestSummaryYear(id),
  ]);

  if (!personData) {
    notFound();
  }

  const { person, competitionCount, personalRecords, medals, regionalRecords } =
    personData;
  const isOrganizer = organizerStatus !== null;
  const isDelegate = person.delegateStatus !== null;
  const tier = getTier(membershipData);
  const showRecordsTab =
    regionalRecords.total > 0 || (regionalRecords.state ?? 0) > 0;

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

  const SRcount = regionalRecords.state ?? 0;

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
      {latestSummaryYear !== null && (
        <p className="text-center text-sm mb-4">
          <Link
            href={`/summary/${latestSummaryYear}/${id}`}
            className="text-primary hover:underline"
          >
            Resumen anual {latestSummaryYear}
          </Link>
        </p>
      )}
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
                <TableHead className="text-center">SR</TableHead>
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
      <PersonTabs
        wcaId={id}
        eventOptions={eventOptions}
        showRecordsTab={showRecordsTab}
        showChampionshipPodiumsTab={showChampionshipPodiumsTab}
        showStaffCompetitionsTab={showStaffCompetitionsTab}
      />
    </>
  );
}

export default async function Page({ params }: Props) {
  const id = (await params).id;

  return <PersonPageContent id={id} />;
}
