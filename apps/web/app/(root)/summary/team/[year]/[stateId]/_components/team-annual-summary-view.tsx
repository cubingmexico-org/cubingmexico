import { KinchSorSection } from "../../../../_components/kinch-sor-section";
import { Stat } from "../../../../_components/summary-stat";
import { UnofficialSummarySection } from "../../../../_components/unofficial-summary-section";
import type { TeamAnnualSummary } from "../_lib/queries";
import type { TeamYearUnofficial } from "../_lib/unofficial";
import {
  TeamActivitySections,
  TeamMostActiveSection,
} from "./team-activity-sections";
import { TeamCommunitySections } from "./team-community-sections";
import {
  TeamHostedSections,
  TeamHostedStatsSections,
} from "./team-hosted-sections";
import { TeamPodiumSections } from "./team-podium-sections";
import { TeamRecordsSection } from "./team-records-section";
import { TeamStaffSection } from "./team-staff-section";
import { TeamSummaryHeader } from "./team-summary-header";
import { TeamTravelSections } from "./team-travel-sections";

type Props = {
  summary: TeamAnnualSummary;
  unofficial?: TeamYearUnofficial | null;
};

export function TeamAnnualSummaryView({ summary, unofficial }: Props) {
  const { team, year, hosted, members, staff } = summary;

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      <TeamSummaryHeader summary={summary} />

      <TeamActivitySections year={year} members={members} />

      <TeamHostedSections year={year} team={team} hosted={hosted} />

      {unofficial && unofficial.resultCount > 0 && (
        <UnofficialSummarySection
          lead={
            <>
              <Stat>{unofficial.memberCount}</Stat>{" "}
              {unofficial.memberCount === 1
                ? "miembro del Team registró"
                : "miembros del Team registraron"}
            </>
          }
          summary={unofficial}
        />
      )}

      <TeamHostedStatsSections team={team} hosted={hosted} />

      <TeamMostActiveSection year={year} mostActive={members.mostActive} />

      <TeamTravelSections stateName={team.stateName} members={members} />

      <TeamCommunitySections members={members} />

      <TeamPodiumSections year={year} members={members} />

      <TeamRecordsSection records={members.records} />

      <KinchSorSection
        description={
          <>
            Puntajes del Team (mejor miembro por evento) al inicio y al final de{" "}
            {year}.
          </>
        }
        beforeLabel={year - 1}
        year={year}
        kinchSor={members.kinchSor}
      />

      <TeamStaffSection year={year} staff={staff} />
    </div>
  );
}
