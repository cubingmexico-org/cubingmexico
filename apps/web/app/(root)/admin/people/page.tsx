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
import {
  getPersonStateGuesses,
  getTeamMembersWithRoles,
} from "../_lib/queries";
import { AssignPersonForm } from "./_components/assign-person-form";
import {
  ConfidenceFilter,
  type ConfidenceFilterValue,
} from "./_components/confidence-filter";
import { StateFilter } from "./_components/state-filter";
import { StateGuessTable } from "./_components/state-guess-table";
import { TeamRolesTable } from "./_components/team-roles-table";

function parseConfidence(
  value: string | undefined,
): ConfidenceFilterValue {
  if (value === "all" || value === "medium" || value === "none") {
    return value;
  }
  return "high";
}

async function PeopleAdminContent({
  searchParams,
}: {
  searchParams: Promise<{ stateId?: string; confidence?: string }>;
}) {
  const params = await searchParams;
  const states = await getStates();
  const selectedStateId =
    params.stateId && states.some((s) => s.id === params.stateId)
      ? params.stateId
      : (states[0]?.id ?? null);
  const confidence = parseConfidence(params.confidence);

  const [personStateGuesses, members] = await Promise.all([
    getPersonStateGuesses({
      limit: 10,
      confidence,
    }),
    selectedStateId
      ? getTeamMembersWithRoles(selectedStateId)
      : Promise.resolve([]),
  ]);

  const highCount = personStateGuesses.filter(
    (guess) => guess.confidence === "high",
  ).length;

  const confidenceLabel =
    confidence === "all"
      ? "todas las confianzas"
      : confidence === "high"
        ? "confianza alta"
        : confidence === "medium"
          ? "confianza media"
          : "confianza baja";

  return (
    <div className="space-y-6">
      <AssignPersonForm states={states} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Roles por estado</CardTitle>
          <CardDescription>
            Bootstrap o revoca admins/editores de cualquier team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Suspense fallback={null}>
            <StateFilter states={states} selectedStateId={selectedStateId} />
          </Suspense>
          {selectedStateId ? (
            <TeamRolesTable stateId={selectedStateId} members={members} />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sugerir estado</CardTitle>
          <CardDescription>
            Top 10 personas sin afiliación ({confidenceLabel}), ordenadas por
            NR 333 / comps. Sugerencia según competencias MX (excluye
            Nacionales).{" "}
            {highCount > 0
              ? `${highCount} con confianza alta preseleccionadas.`
              : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Suspense fallback={null}>
            <ConfidenceFilter selected={confidence} />
          </Suspense>
          <StateGuessTable
            key={`${confidence}:${personStateGuesses.map((guess) => guess.wcaId).join(",")}`}
            guesses={personStateGuesses}
            states={states}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ stateId?: string; confidence?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      }
    >
      <PeopleAdminContent searchParams={searchParams} />
    </Suspense>
  );
}
