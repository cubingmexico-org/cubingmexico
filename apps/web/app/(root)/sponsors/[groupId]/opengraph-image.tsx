import { getGroupInfo } from "../../groups/_lib/queries";
import { renderOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og/render";

export const alt = "Patrocinador | Cubing México";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

type Props = {
  params: Promise<{ groupId: string }>;
};

export default async function Image({ params }: Props) {
  const { groupId } = await params;
  const group = await getGroupInfo(groupId);

  if (!group) {
    return renderOgImage({
      title: "Patrocinadores",
      subtitle: "Patrocinadores de Cubing México.",
      badge: "Sponsor",
    });
  }

  return renderOgImage({
    title: group.name,
    subtitle:
      group.publicityBlurb?.trim() ||
      group.description?.trim() ||
      "Patrocinador de Cubing México.",
    badge: "Sponsor",
    imageSrc: group.image,
    initials: group.name,
  });
}
