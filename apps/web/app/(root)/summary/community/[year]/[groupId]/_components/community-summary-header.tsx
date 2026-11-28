import Link from "next/link";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { groupHref } from "@/lib/groups";
import { Stat } from "../../../../_components/summary-stat";
import { SummaryYearNav } from "../../../../_components/summary-year-nav";
import { teamInitials } from "../../../../_lib/format";
import type { CommunityAnnualSummary } from "../_lib/queries";

export function CommunitySummaryHeader({
  summary,
}: {
  summary: CommunityAnnualSummary;
}) {
  const { community, year, availableYears } = summary;
  const href = groupHref("community", community.id);

  return (
    <div className="min-w-0 space-y-3 text-center">
      <Link
        href={href}
        prefetch={false}
        className="mx-auto inline-flex"
        aria-label={`Ver ${community.name}`}
      >
        <Avatar className="size-20 sm:size-24 border-2 border-border shadow-sm">
          <AvatarImage
            src={community.image ?? undefined}
            alt={community.name}
          />
          <AvatarFallback className="text-lg font-semibold">
            {teamInitials(community.name, community.id.slice(0, 3))}
          </AvatarFallback>
        </Avatar>
      </Link>
      <h1 className="text-2xl font-bold break-words sm:text-3xl">
        <Link
          href={href}
          prefetch={false}
          className="text-link hover:text-link/80"
        >
          {community.name}
        </Link>
        {` — Resumen anual `}
        <Stat>{year}</Stat>
      </h1>
      <p className="text-sm text-muted-foreground">
        {community.regionLabel ? (
          <>
            {community.regionLabel}
            {" · "}
          </>
        ) : null}
        <Link
          href={href}
          prefetch={false}
          className="text-primary hover:underline"
        >
          Ver comunidad
        </Link>
      </p>
      <SummaryYearNav
        year={year}
        availableYears={availableYears}
        href={(availableYear) =>
          `/summary/community/${availableYear}/${community.id}`
        }
      />
    </div>
  );
}
