import Link from "next/link";
import { buttonVariants } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { getAdminTeams, getStatesWithoutTeams } from "../_lib/queries/teams";
import { CreateTeamForm } from "./_components/create-team-form";

export default async function Page() {
  const [teams, statesWithoutTeams] = await Promise.all([
    getAdminTeams(),
    getStatesWithoutTeams(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Teams estatales</h1>
        <p className="text-sm text-muted-foreground">
          Crear teams para estados sin uno, o abrir Administrar para editar
          perfil, roster e imágenes.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Crear team</h2>
        <CreateTeamForm states={statesWithoutTeams} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Teams existentes</h2>
        {teams.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay teams aún.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {teams.map((item) => (
              <li
                key={item.stateId}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.stateName} · {item.stateId}
                    {item.isActive ? "" : " · inactivo"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/teams/${item.stateId}`}
                    prefetch={false}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                    )}
                  >
                    Ver
                  </Link>
                  <Link
                    href={`/teams/${item.stateId}/manage`}
                    prefetch={false}
                    className={cn(buttonVariants({ size: "sm" }))}
                  >
                    Administrar
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
