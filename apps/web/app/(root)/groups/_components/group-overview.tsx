import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import type { GroupKind } from "@workspace/db/schema";
import { groupHref } from "@/lib/groups";
import { getTeamSocialLinks } from "@/app/(root)/teams/[stateId]/_lib/social-links";
import {
  KeyStat,
  MedalStrip,
} from "@/app/(root)/teams/[stateId]/_components/team-profile-shared";
import {
  getGroupInfo,
  getGroupMedals,
  getGroupTopMembersByPodiums,
} from "../_lib/queries";

const EXPLORE_LINKS = [
  { suffix: "/rankings/333/single", label: "Rankings" },
  { suffix: "/records", label: "Récords" },
  { suffix: "/sor/single", label: "SOR" },
  { suffix: "/kinch", label: "Kinch" },
] as const;

export async function GroupOverview({
  groupId,
  kind,
}: {
  groupId: string;
  kind: GroupKind;
}) {
  const [info, medals, topMembers] = await Promise.all([
    getGroupInfo(groupId),
    getGroupMedals(groupId),
    getGroupTopMembersByPodiums(groupId),
  ]);

  if (!info || info.kind !== kind) {
    return null;
  }

  const socialLinks = getTeamSocialLinks(info.socialLinks);
  const base = groupHref(kind, groupId);

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-3">
      <div className="min-w-0 space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Acerca de</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {info.description ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {info.description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {kind === "community"
                  ? "Esta comunidad aún no tiene descripción."
                  : "Este equipo aún no tiene descripción."}
              </p>
            )}
            {socialLinks.length > 0 ? (
              <div className="flex flex-wrap gap-2 border-t pt-4">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <Link
                      key={social.key}
                      href={social.href}
                      className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      {...(social.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                    >
                      <Icon className="h-4 w-4" />
                      {social.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Podios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Medallas oficiales de los miembros del grupo en finales WCA.
            </p>
            <MedalStrip medals={medals} />
            <KeyStat label="Podios totales" value={medals.total} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estadísticas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Rankings, récords, SOR y Kinch se calculan con los resultados del
              grupo.
            </p>
            <div className="flex flex-wrap gap-2">
              {EXPLORE_LINKS.map((link) => (
                <Link
                  key={link.suffix}
                  href={`${base}${link.suffix}`}
                  className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="min-w-0 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Top miembros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aún no hay podios registrados.
              </p>
            ) : (
              topMembers.map((member) => (
                <div
                  key={member.wcaId}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <Link
                    href={`/persons/${member.wcaId}`}
                    prefetch={false}
                    className="truncate font-medium hover:underline"
                  >
                    {member.name}
                  </Link>
                  <span className="shrink-0 text-muted-foreground">
                    {member.podiums} {member.podiums === 1 ? "podio" : "podios"}
                  </span>
                </div>
              ))
            )}
            <Link
              href={`${base}/members`}
              className="inline-block text-sm text-brand hover:underline"
            >
              Ver roster completo
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
