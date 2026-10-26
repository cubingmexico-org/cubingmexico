import Link from "next/link";
import { Stat } from "../../../_components/summary-stat";
import { SummaryYearNav } from "../../../_components/summary-year-nav";
import { formatSummaryDate } from "../../../_lib/format";
import type { AnnualSummary } from "../_lib/queries";
import { getShareHighlights } from "../_lib/share-highlights";
import { SummaryShareButton } from "./summary-share-button";

export function SummaryHeader({ summary }: { summary: AnnualSummary }) {
  const {
    person,
    year,
    availableYears,
    competitionCount,
    roundCount,
    eventCount,
    firstCompetitionDate,
    lastCompetitionDate,
  } = summary;

  const displayName = person.name ?? person.wcaId;
  const shareData = {
    name: displayName,
    wcaId: person.wcaId,
    year,
    highlights: getShareHighlights(summary),
  };

  return (
    <div className="text-center space-y-3">
      <h1 className="text-2xl sm:text-3xl font-bold">
        <Link
          href={`/persons/${person.wcaId}`}
          prefetch={false}
          className="text-link hover:text-link/80"
        >
          {displayName}
        </Link>
        {` — Resumen anual `}
        <Stat>{year}</Stat>
      </h1>
      <SummaryYearNav
        year={year}
        availableYears={availableYears}
        href={(availableYear) => `/summary/${availableYear}/${person.wcaId}`}
      />
      {shareData.highlights.length > 0 && (
        <div className="flex justify-center pt-1">
          <SummaryShareButton data={shareData} />
        </div>
      )}
      <p className="text-muted-foreground text-sm sm:text-base">
        En el año <Stat>{year}</Stat>, {displayName} compitió en{" "}
        <Stat>{competitionCount}</Stat>{" "}
        {competitionCount === 1 ? "competencia" : "competencias"} y{" "}
        <Stat>{roundCount}</Stat> {roundCount === 1 ? "ronda" : "rondas"} a
        través de <Stat>{eventCount}</Stat>{" "}
        {eventCount === 1 ? "evento" : "eventos"}, del{" "}
        <Stat>{formatSummaryDate(firstCompetitionDate)}</Stat> al{" "}
        <Stat>{formatSummaryDate(lastCompetitionDate)}</Stat>.
      </p>
    </div>
  );
}
