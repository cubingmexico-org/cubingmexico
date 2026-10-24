import Link from "next/link";
import { StateLabel } from "@/components/state-flag";
import type { CcCompetitor } from "@/lib/cubing-contests";

export function CcCompetitorName({ competitor }: { competitor: CcCompetitor }) {
  if (!competitor.wcaId) {
    return <span>{competitor.name}</span>;
  }
  return (
    <Link
      prefetch={false}
      href={`/persons/${competitor.wcaId}`}
      className="text-link hover:text-link/80"
    >
      {competitor.name}
    </Link>
  );
}

export function CcCompetitors({
  competitors,
  showState = true,
}: {
  competitors: CcCompetitor[];
  showState?: boolean;
}) {
  return (
    <div className="space-y-1">
      {competitors.map((competitor) => (
        <div key={competitor.ccPersonId}>
          <CcCompetitorName competitor={competitor} />
          {showState && competitor.stateName && (
            <div className="text-xs text-muted-foreground">
              <StateLabel stateName={competitor.stateName} size={12} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
