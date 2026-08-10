import Link from "next/link";
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
  getPersonsWithoutStateList,
  getTeamMembersWithRoles,
} from "../_lib/queries";
import { AssignPersonForm } from "./_components/assign-person-form";
import { StateFilter } from "./_components/state-filter";
import { TeamRolesTable } from "./_components/team-roles-table";

async function PeopleAdminContent({
  searchParams,
}: {
  searchParams: Promise<{ stateId?: string }>;
}) {
  const params = await searchParams;
  const states = await getStates();
  const selectedStateId =
    params.stateId && states.some((s) => s.id === params.stateId)
      ? params.stateId
      : (states[0]?.id ?? null);

  const [personsWithoutState, members] = await Promise.all([
    getPersonsWithoutStateList(40),
    selectedStateId
      ? getTeamMembersWithRoles(selectedStateId)
      : Promise.resolve([]),
  ]);

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
          <CardTitle className="text-base">Personas sin estado</CardTitle>
          <CardDescription>
            Primeras 40 personas sin afiliación (usa el formulario de arriba
            para asignar)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {personsWithoutState.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No hay personas sin estado.
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {personsWithoutState.map((person) => (
                <li
                  key={person.wcaId}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{person.name}</p>
                    <p className="text-muted-foreground font-mono text-xs">
                      {person.wcaId}
                    </p>
                  </div>
                  <Link
                    href={`/persons/${person.wcaId}`}
                    className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
                  >
                    Ver
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ stateId?: string }>;
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
