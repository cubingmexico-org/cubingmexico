import Link from "next/link";
import { Crown, Skull, Swords } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { getTierClass, type getTier } from "@/lib/utils";
import { formatDelegateLevel } from "@/lib/delegate-level";
import type { OrganizerStatus } from "../_lib/queries";
import type { PersonNemesisStats } from "../../_lib/nemesis-queries";

const numberFormat = new Intl.NumberFormat("es-MX");

export function PersonBadges({
  wcaId,
  person,
  team,
  tier,
  organizerStatus,
  nemesisStats,
}: {
  wcaId: string;
  person: {
    gender: string | null;
    delegateStatus: Parameters<typeof formatDelegateLevel>[0];
  };
  team: { id: string; name: string; image: string | null } | null;
  tier: ReturnType<typeof getTier>;
  organizerStatus: OrganizerStatus;
  nemesisStats: PersonNemesisStats | null;
}) {
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
            {team.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- external UploadThing URL
              <img
                src={team.image}
                alt=""
                width={14}
                height={14}
                className="size-3.5 rounded-sm object-cover"
              />
            ) : null}
            {team.name}
          </Link>
        </Badge>
      )}
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
