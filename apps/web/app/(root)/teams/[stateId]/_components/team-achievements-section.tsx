import Link from "next/link";
import { ChartNoAxesCombined } from "lucide-react";
import { buttonVariants } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import type { TeamMedals } from "../_lib/queries";
import { KeyStat, MedalStrip } from "./team-profile-shared";

export function TeamAchievementsSection({
  stateId,
  stateName,
  medals,
  totalNationalRecords,
  competitionsCount,
  activeYears,
  unofficialMedals,
}: {
  stateId: string;
  stateName: string;
  medals: TeamMedals;
  totalNationalRecords: number;
  competitionsCount: number;
  activeYears: number;
  unofficialMedals: TeamMedals;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Logros del Team</h2>
          <p className="text-sm text-muted-foreground">
            Medallas y récords nacionales de sus miembros
          </p>
        </div>
        <Link
          href={`/teams/${stateId}/statistics`}
          prefetch={false}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "gap-1.5",
          )}
        >
          <ChartNoAxesCombined className="h-4 w-4" />
          Ver estadísticas
        </Link>
      </div>

      <MedalStrip medals={medals} />

      <div
        className={
          activeYears > 0
            ? "grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
            : "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4"
        }
      >
        <KeyStat
          label="Podios totales"
          value={medals.total}
          href={`/teams/${stateId}/statistics`}
        />
        <KeyStat
          label="Récords nacionales"
          value={totalNationalRecords}
          href={`/teams/${stateId}/statistics`}
        />
        <KeyStat
          label="Competencias"
          value={competitionsCount}
          href={`/teams/${stateId}/competitions`}
          className={activeYears > 0 ? undefined : "col-span-2 sm:col-span-1"}
        />
        {activeYears > 0 ? (
          <KeyStat label="Años activo" value={activeYears} />
        ) : null}
      </div>

      {unofficialMedals.total > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h3 className="text-sm font-semibold">
              Podios en eventos no oficiales
            </h3>
            <Link
              href={`/unofficial/records?state=${encodeURIComponent(stateName)}`}
              prefetch={false}
              className="text-sm text-link hover:text-link/80"
            >
              Ver récords no oficiales
            </Link>
          </div>
          <MedalStrip medals={unofficialMedals} />
        </div>
      )}
    </section>
  );
}
