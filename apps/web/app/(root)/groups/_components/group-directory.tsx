import { PageHeading } from "@/components/page-heading";
import type { GroupKind } from "@workspace/db/schema";
import { groupKindPluralLabel } from "@/lib/groups";
import { getGroupsByKind } from "../_lib/queries";
import { GroupCard } from "./group-card";

export async function GroupDirectory({ kind }: { kind: GroupKind }) {
  const groups = await getGroupsByKind(kind);
  const title = groupKindPluralLabel(kind);

  return (
    <main className="container mx-auto grow px-4 py-8 sm:px-6">
      <div className="mb-8 space-y-2">
        <PageHeading>{title}</PageHeading>
        <p className="max-w-2xl text-muted-foreground">
          {kind === "community"
            ? "Comunidades locales de speedcubing. Son independientes de los teams estatales."
            : "Equipos patrocinados por tiendas y marcas. Los teams estatales siguen siendo el foco principal."}
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {kind === "community"
            ? "Aún no hay comunidades publicadas."
            : "No hay patrocinadores activos por ahora."}
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((item) => (
            <GroupCard
              key={item.id}
              id={item.id}
              kind={item.kind}
              name={item.name}
              description={item.description}
              image={item.image}
              coverImage={item.coverImage}
              subtitle={
                kind === "community"
                  ? item.regionLabel
                  : item.websiteUrl
              }
              founded={item.founded}
              isActive={item.isActive}
              members={Number(item.members)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
