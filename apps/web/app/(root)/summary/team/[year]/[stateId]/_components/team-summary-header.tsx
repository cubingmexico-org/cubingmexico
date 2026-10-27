import Link from "next/link";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { StateLabel } from "@/components/state-flag";
import { Stat } from "../../../../_components/summary-stat";
import { SummaryYearNav } from "../../../../_components/summary-year-nav";
import { teamInitials } from "../../../../_lib/format";
import type { TeamAnnualSummary } from "../_lib/queries";
import { getTeamShareHighlights } from "../_lib/share-highlights";
import { TeamSummaryShareButton } from "./team-summary-share-button";

export function TeamSummaryHeader({ summary }: { summary: TeamAnnualSummary }) {
  const { team, year, availableYears } = summary;

  const shareData = {
    name: team.name,
    stateName: team.stateName,
    stateId: team.stateId,
    image: team.image,
    year,
    highlights: getTeamShareHighlights(summary),
  };

  return (
    <div className="text-center space-y-3">
      <Link
        href={`/teams/${team.stateId}`}
        prefetch={false}
        className="mx-auto inline-flex"
        aria-label={`Ver ${team.name}`}
      >
        <Avatar className="size-20 sm:size-24 border-2 border-border shadow-sm">
          <AvatarImage src={team.image ?? undefined} alt={team.name} />
          <AvatarFallback className="text-lg font-semibold">
            {teamInitials(team.name, team.stateId)}
          </AvatarFallback>
        </Avatar>
      </Link>
      <h1 className="text-2xl sm:text-3xl font-bold">
        <Link
          href={`/teams/${team.stateId}`}
          prefetch={false}
          className="text-link hover:text-link/80"
        >
          {team.name}
        </Link>
        {` — Resumen anual `}
        <Stat>{year}</Stat>
      </h1>
      <p className="text-sm text-muted-foreground">
        <StateLabel stateId={team.stateId} stateName={team.stateName} />
        {" · "}
        <Link
          href={`/teams/${team.stateId}`}
          prefetch={false}
          className="text-primary hover:underline"
        >
          Ver Team
        </Link>
      </p>
      <SummaryYearNav
        year={year}
        availableYears={availableYears}
        href={(availableYear) =>
          `/summary/team/${availableYear}/${team.stateId}`
        }
      />
      {shareData.highlights.length > 0 && (
        <div className="flex justify-center pt-1">
          <TeamSummaryShareButton data={shareData} />
        </div>
      )}
    </div>
  );
}
