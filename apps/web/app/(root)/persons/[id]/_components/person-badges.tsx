import Link from "next/link";
import { Crown, Skull, Swords } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { brandMarkSrc } from "@/lib/brand-image";
import { getTierClass, type getTier } from "@/lib/utils";
import { formatDelegateLevel } from "@/lib/delegate-level";
import { groupHref } from "@/lib/groups";
import type { GroupKind } from "@workspace/db/schema";
import type { OrganizerStatus } from "../_lib/queries";
import type { PersonNemesisStats } from "../../_lib/nemesis-queries";

const numberFormat = new Intl.NumberFormat("es-MX");

export function PersonBadges({
  wcaId,
  person,
  team,
  groups,
  tier,
  organizerStatus,
  nemesisStats,
}: {
  wcaId: string;
  person: {
    gender: string | null;
    delegateStatus: Parameters<typeof formatDelegateLevel>[0];
  };
  team: {
    id: string;
    name: string;
    image: string | null;
    icon: string | null;
  } | null;
  groups?: {
    id: string;
    kind: GroupKind;
    name: string;
    image: string | null;
    icon: string | null;
  }[];
  tier: ReturnType<typeof getTier>;
  organizerStatus: OrganizerStatus;
  nemesisStats: PersonNemesisStats | null;
}) {
  const teamMark = team ? brandMarkSrc(team.icon, team.image) : null;

  return (
    <div className="w-full flex flex-wrap justify-center gap-2 mb-2">
      {tier && <Badge className={getTierClass(tier)}>Miembro {tier}</Badge>}
      {person.delegateStatus !== null && (
        <Badge>
          {formatDelegateLevel(person.delegateStatus, person.gender)}
        </Badge>
      )}
      {organizerStatus && (
        <Badge variant="outline">
          Organizador{person.gender === "f" ? "a" : ""} {organizerStatus.level}
        </Badge>
      )}
      {team && (
        <Badge variant="outline" asChild>
          <Link href={`/teams/${team.id}`} prefetch={false} className="gap-1.5">
            {teamMark ? (
              // eslint-disable-next-line @next/next/no-img-element -- external UploadThing URL
              <img
                src={teamMark}
                alt=""
                width={14}
                height={14}
                className="size-3.5 object-contain"
              />
            ) : null}
            {team.name}
          </Link>
        </Badge>
      )}
      {(groups ?? []).map((group) => {
        const mark = brandMarkSrc(group.icon, group.image);
        return (
          <Badge key={group.id} variant="outline" asChild>
            <Link
              href={groupHref(group.kind, group.id)}
              prefetch={false}
              className="gap-1.5"
            >
              {mark ? (
                // eslint-disable-next-line @next/next/no-img-element -- external UploadThing URL
                <img
                  src={mark}
                  alt=""
                  width={14}
                  height={14}
                  className="size-3.5 object-contain"
                />
              ) : null}
              {group.name}
            </Link>
          </Badge>
        );
      })}
      <Badge variant="outline" asChild>
        <Link
          href={`/persons/compare?a=${wcaId}`}
          prefetch={false}
          className="gap-1.5"
        >
          <Swords className="size-3.5" />
          Comparar
        </Link>
      </Badge>
      {nemesisStats && nemesisStats.slotCount > 0 && (
        <Badge variant="outline" asChild>
          <Link
            href={`/persons/${wcaId}?tab=nemesis`}
            prefetch={false}
            className="gap-1.5"
          >
            {nemesisStats.nemesisCount === 0 ? (
              <>
                <Crown className="size-3.5" />
                Invict{person.gender === "f" ? "a" : "o"}
              </>
            ) : (
              <>
                <Skull className="size-3.5" />
                {numberFormat.format(nemesisStats.nemesisCount)} némesis
              </>
            )}
            {nemesisStats.nemesizedCount > 0 &&
              ` · némesis de ${numberFormat.format(nemesisStats.nemesizedCount)}`}
          </Link>
        </Badge>
      )}
    </div>
  );
}
