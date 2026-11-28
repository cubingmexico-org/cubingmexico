import Link from "next/link";
import { buttonVariants } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import {
  formatGroupLocationLine,
  groupHref,
  groupKindLabel,
} from "@/lib/groups";
import { getAdminGroups } from "../_lib/queries/groups";
import { CreateGroupForm } from "./_components/create-group-form";

function groupStatusLabel(
  item: Awaited<ReturnType<typeof getAdminGroups>>[number],
) {
  const parts: string[] = [];
  if (!item.isActive) parts.push("inactivo");
  if (item.kind === "sponsor") {
    if (item.sponsorshipStatus === "active") parts.push("patrocinio activo");
    else if (item.sponsorshipStatus === "expired")
      parts.push("patrocinio expirado");
    else parts.push("patrocinio inactivo");
    if (item.publicityEnabled) parts.push("publicidad");
  }
  const location = formatGroupLocationLine({
    kind: item.kind,
    regionLabel: item.regionLabel,
    city: item.city,
    stateName: item.stateName,
  });
  if (location) parts.push(location);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export default async function Page() {
  const groups = await getAdminGroups();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Grupos</h1>
        <p className="text-sm text-muted-foreground">
          Crear comunidades y equipos patrocinados, o abrir Administrar para
          editar perfil, roster e imágenes. La activación de patrocinio y
          publicidad se hace desde Administrar del grupo.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Crear grupo</h2>
        <CreateGroupForm />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Grupos existentes</h2>
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay grupos aún.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {groups.map((item) => {
              const href = groupHref(item.kind, item.id);
              const status = groupStatusLabel(item);
              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {groupKindLabel(item.kind)} · {item.id}
                      {status ? ` · ${status}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={href}
                      prefetch={false}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                      )}
                    >
                      Ver
                    </Link>
                    <Link
                      href={`${href}/manage`}
                      prefetch={false}
                      className={cn(buttonVariants({ size: "sm" }))}
                    >
                      Administrar
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
