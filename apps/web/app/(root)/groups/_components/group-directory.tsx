import type { GroupKind } from "@workspace/db/schema";
import { getGroupsByKind } from "../_lib/queries";
import { GroupDirectoryView } from "./group-directory-view";

export async function GroupDirectory({ kind }: { kind: GroupKind }) {
  const groups = await getGroupsByKind(kind);

  return (
    <GroupDirectoryView
      kind={kind}
      groups={groups.map((item) => ({
        id: item.id,
        kind: item.kind,
        name: item.name,
        description: item.description,
        image: item.image,
        coverImage: item.coverImage,
        subtitle: item.regionLabel,
        founded: item.founded,
        isActive: item.isActive,
        members: Number(item.members),
      }))}
    />
  );
}
