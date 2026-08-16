import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { getStates } from "@/db/queries";
import { getMexicanCompetitions } from "../_lib/queries";
import {
  CompetitionsFilters,
  CompetitionsTable,
} from "./_components/competitions-admin";
import { RefreshMxCompetitionsButton } from "./_components/refresh-mx-button";
import { ImportMissingLogosButton } from "./_components/import-missing-logos-button";
import { ImportMissingSchedulesButton } from "./_components/import-missing-schedules-button";

async function CompetitionsAdminContent({
  searchParams,
}: {
  searchParams: Promise<{
    missing?: string;
    missingLogo?: string;
    missingSchedule?: string;
    stateId?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;
  const missingOnly = params.missing === "1";
  const missingLogoOnly = params.missingLogo === "1";
  const missingScheduleOnly = params.missingSchedule === "1";
  const stateId = missingOnly ? null : (params.stateId ?? null);
  const search = params.q ?? "";

  const [states, competitions] = await Promise.all([
    getStates(),
    getMexicanCompetitions({
      missingStateOnly: missingOnly,
      missingLogoOnly,
      missingScheduleOnly,
      stateId,
      search,
      limit: 100,
    }),
  ]);

  return (
    <>
      <Suspense fallback={null}>
        <CompetitionsFilters
          states={states}
          missingOnly={missingOnly}
          missingLogoOnly={missingLogoOnly}
          missingScheduleOnly={missingScheduleOnly}
          stateId={stateId}
          search={search}
        />
      </Suspense>
      <CompetitionsTable competitions={competitions} states={states} />
    </>
  );
}

export default function AdminCompetitionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    missing?: string;
    missingLogo?: string;
    missingSchedule?: string;
    stateId?: string;
    q?: string;
  }>;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Competencias mexicanas</CardTitle>
            <CardDescription>
              Asigna `stateId`, gestiona logos y fechas de fin de ronda (9i2)
              cuando ya hay resultados
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <ImportMissingSchedulesButton />
            <ImportMissingLogosButton />
            <RefreshMxCompetitionsButton />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Suspense
            fallback={
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            }
          >
            <CompetitionsAdminContent searchParams={searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
