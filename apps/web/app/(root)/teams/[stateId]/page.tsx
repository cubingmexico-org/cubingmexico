import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSearchParamsCache } from "nuqs/server";
import { getStatesGeoJSON, getTeam } from "@/db/queries";
import { getCcRecords } from "@/app/(root)/unofficial/_lib/queries";
import { eventScopeFromDeprecated } from "@/lib/official-events";
import { deprecatedParser } from "@/lib/search-params";
import type { SearchParams } from "@/types";
import { getTeamOverviewData } from "./_lib/queries";
import { getTeamSocialLinks } from "./_lib/social-links";
import { getTeamUnofficialMedals } from "./_lib/unofficial";
import { TeamAboutCard } from "./_components/team-about-card";
import { TeamAchievementsSection } from "./_components/team-achievements-section";
import { TeamLocationCard } from "./_components/team-location-card";
import { TeamNationalRecordsCard } from "./_components/team-national-records-card";
import { TeamTopMembersCard } from "./_components/team-top-members-card";
import { TeamUnofficialRecordsCard } from "./_components/team-unofficial-records-card";
import { TeamUpcomingCompetitionsCard } from "./_components/team-upcoming-competitions-card";

const searchParamsCache = createSearchParamsCache({
  deprecated: deprecatedParser,
});

type Props = {
  params: Promise<{ stateId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const stateId = (await params).stateId;
  const team = await getTeam(stateId);

  return {
    title: `${team?.name} | Cubing México`,
    description: `${team?.name} es un equipo de ${team?.state} que compite en competencias de la World Cube Association.`,
  };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ stateId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const stateId = (await params).stateId;
  const { deprecated } = searchParamsCache.parse(await searchParams);
  const [data, statesGeoJSON] = await Promise.all([
    getTeamOverviewData(stateId, eventScopeFromDeprecated(deprecated)),
    getStatesGeoJSON(),
  ]);

  if (!data) {
    return notFound();
  }

  const [unofficialRecords, unofficialMedals] = await Promise.all([
    getCcRecords({ state: data.team.state, event: "" }),
    getTeamUnofficialMedals(stateId),
  ]);

  const { team } = data;

  return (
    <div className="min-w-0 space-y-8">
      <TeamAchievementsSection
        stateId={stateId}
        stateName={team.state}
        medals={data.medals}
        totalNationalRecords={data.totalNationalRecords}
        competitionsCount={data.competitionsCount}
        activeYears={data.activeYears}
        unofficialMedals={unofficialMedals}
      />

      <div className="grid min-w-0 gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <TeamAboutCard
            description={team.description}
            socialLinks={getTeamSocialLinks(team.socialLinks)}
          />
          <TeamTopMembersCard stateId={stateId} topMembers={data.topMembers} />
          <TeamNationalRecordsCard
            stateId={stateId}
            deprecated={deprecated}
            records={data.nationalRecordsTeaser}
          />
          <TeamUnofficialRecordsCard
            stateName={team.state}
            records={unofficialRecords}
          />
        </div>

        <div className="min-w-0 space-y-6">
          <TeamLocationCard
            stateId={stateId}
            stateName={team.state}
            statesGeoJSON={statesGeoJSON}
          />
          <TeamUpcomingCompetitionsCard
            stateId={stateId}
            competitions={data.upcomingCompetitions}
          />
        </div>
      </div>
    </div>
  );
}
