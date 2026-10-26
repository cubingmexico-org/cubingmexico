import type { CcYearSummary } from "@/lib/cubing-contests";
import { KinchSorSection } from "../../../_components/kinch-sor-section";
import { UnofficialSummarySection } from "../../../_components/unofficial-summary-section";
import { prevYearLabel, subjectPronoun } from "../_lib/format";
import type { AnnualSummary } from "../_lib/queries";
import { PrStreakSection, SolvesSection } from "./competition-sections";
import { CubersSection } from "./cubers-section";
import { MollerzSection } from "./mollerz-section";
import { PersonalBestsSection } from "./personal-bests-section";
import { ChampionshipPodiumsSection, PodiumsSection } from "./podiums-section";
import { RankProgressSection } from "./rank-progress-section";
import { RecordsSection } from "./records-section";
import { StaffSection } from "./staff-section";
import { StatesSection, TravelKmSection } from "./states-section";
import { SummaryHeader } from "./summary-header";

type Props = {
  summary: AnnualSummary;
  unofficial?: CcYearSummary | null;
};

export function AnnualSummaryView({ summary, unofficial }: Props) {
  const {
    person,
    year,
    podiums,
    records,
    championshipPodiums,
    prStreak,
    solves,
    personalBests,
    cubers,
    states,
    travelKm,
    rankProgress,
    kinchSor,
    mollerz,
    staff,
  } = summary;

  const pronoun = subjectPronoun(person.gender);

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      <SummaryHeader summary={summary} />

      <PodiumsSection pronoun={pronoun} podiums={podiums} />

      <RecordsSection pronoun={pronoun} records={records} />

      {unofficial && unofficial.resultCount > 0 && (
        <UnofficialSummarySection
          lead={`${pronoun} registró`}
          summary={unofficial}
        />
      )}

      <ChampionshipPodiumsSection
        pronoun={pronoun}
        championshipPodiums={championshipPodiums}
      />

      <PrStreakSection year={year} prStreak={prStreak} />

      <SolvesSection pronoun={pronoun} solves={solves} />

      <PersonalBestsSection
        pronoun={pronoun}
        year={year}
        personalBests={personalBests}
      />

      <CubersSection pronoun={pronoun} gender={person.gender} cubers={cubers} />

      <StatesSection pronoun={pronoun} states={states} />

      <TravelKmSection pronoun={pronoun} year={year} travelKm={travelKm} />

      <RankProgressSection year={year} rankProgress={rankProgress} />

      <KinchSorSection
        description={
          <>
            Comparación de puntajes al inicio y al final de {year} (no es el
            lugar nacional).
          </>
        }
        beforeLabel={prevYearLabel(year)}
        year={year}
        kinchSor={kinchSor}
      />

      <MollerzSection year={year} mollerz={mollerz} />

      <StaffSection pronoun={pronoun} staff={staff} />
    </div>
  );
}
