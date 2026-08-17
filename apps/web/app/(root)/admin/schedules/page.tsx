import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { getCompetitionsMissingSchedules } from "../_lib/queries";
import { ImportMissingSchedulesButton } from "../competitions/_components/import-missing-schedules-button";
import {
  LookupScheduleById,
  MissingSchedulesTable,
  SchedulesSearch,
} from "./_components/schedules-admin";

async function SchedulesAdminContent({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const search = params.q ?? "";

  const competitions = await getCompetitionsMissingSchedules({
    search,
    limit: 100,
  });

  return (
    <>
      <SchedulesSearch search={search} />
      <LookupScheduleById />
      <MissingSchedulesTable competitions={competitions} />
    </>
  );
}

export default function AdminSchedulesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">
              Horarios de rondas (9i2)
            </CardTitle>
            <CardDescription>
              Fechas de fin de ronda para cualquier competencia con resultados
              de mexicanos (incluye extranjeras). El cron importa desde WCIF;
              aquí se capturan las que ya no tienen horario público.
            </CardDescription>
          </div>
          <ImportMissingSchedulesButton />
        </CardHeader>
        <CardContent className="space-y-4">
          <Suspense
            fallback={
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            }
          >
            <SchedulesAdminContent searchParams={searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
