import Link from "next/link";
import { ArrowRight, Radio } from "lucide-react";
import { formatCityState } from "@/lib/format";
import type { InProgressLiveCompetition } from "@/lib/live/queries";
import { cn } from "@workspace/ui/lib/utils";

type HomeLiveBannerProps = {
  competitions: InProgressLiveCompetition[];
};

export function HomeLiveBanner({ competitions }: HomeLiveBannerProps) {
  if (competitions.length === 0) return null;

  const single = competitions.length === 1 ? competitions[0] : null;
  const href = single ? `/live/${single.id}` : "/live";
  const location = single
    ? formatCityState(single.cityName, single.stateName)
    : null;

  return (
    <aside
      aria-label="Competencias en vivo"
      className="border-b border-brand/25 bg-brand/10"
    >
      <Link
        href={href}
        prefetch={false}
        className={cn(
          "mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6",
          "transition-colors hover:bg-brand/15",
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand text-white">
          <Radio className="size-4 animate-pulse" aria-hidden />
        </span>
        <div className="min-w-0 grow">
          <p className="font-display text-xs font-semibold uppercase tracking-wide text-brand">
            En vivo
          </p>
          {single ? (
            <>
              <p className="truncate font-medium text-foreground">
                {single.name}
              </p>
              {location ? (
                <p className="truncate text-sm text-muted-foreground">
                  {location}
                </p>
              ) : null}
            </>
          ) : (
            <p className="font-medium text-foreground">
              {competitions.length} competencias en curso
            </p>
          )}
        </div>
        <span className="hidden shrink-0 items-center gap-1 text-sm font-medium text-brand sm:inline-flex">
          Ver resultados
          <ArrowRight className="size-4" aria-hidden />
        </span>
      </Link>
    </aside>
  );
}
