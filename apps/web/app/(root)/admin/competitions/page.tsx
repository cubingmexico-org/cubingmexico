import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { getStates } from "@/db/queries";
import { getMexicanCompetitions } from "../_lib/queries";
import {
  CompetitionsFilters,
  CompetitionsTable,
} from "./_components/competitions-admin";
import { RefreshMxCompetitionsButton } from "./_components/refresh-mx-button";

export default async function AdminCompetitionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    missing?: string;
    stateId?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;
  const missingOnly = params.missing === "1";
  const stateId = missingOnly ? null : (params.stateId ?? null);
  const search = params.q ?? "";

  const [states, competitions] = await Promise.all([
    getStates(),
    getMexicanCompetitions({
      missingStateOnly: missingOnly,
      stateId,
      search,
      limit: 100,
    }),
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Competencias mexicanas</CardTitle>
            <CardDescription>
              Corrige el `stateId` de competencias en México
            </CardDescription>
          </div>
          <RefreshMxCompetitionsButton />
        </CardHeader>
        <CardContent className="space-y-4">
          <Suspense fallback={null}>
            <CompetitionsFilters
              states={states}
              missingOnly={missingOnly}
              stateId={stateId}
              search={search}
            />
          </Suspense>
          <CompetitionsTable competitions={competitions} states={states} />
        </CardContent>
      </Card>
    </div>
  );
}
