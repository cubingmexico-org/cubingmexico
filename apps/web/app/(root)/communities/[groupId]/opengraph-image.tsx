import { getGroupInfo } from "../../groups/_lib/queries";
import { renderOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og/render";

export const alt = "Comunidad | Cubing México";
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
      title: "Comunidades locales",
      subtitle: "Comunidades locales de speedcubing en México.",
      badge: "Comunidad",
    });
  }

  return renderOgImage({
    title: group.name,
    subtitle:
      group.regionLabel?.trim() ||
      group.description?.trim() ||
      "Comunidad de speedcubing en México.",
    badge: "Comunidad",
    imageSrc: group.image,
    initials: group.name,
  });
}
