import type { ComponentType } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { getTeam } from "@/db/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { buttonVariants } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import {
  ArrowRight,
  Calendar,
  ChartNoAxesCombined,
  Mail,
  MapPin,
  Medal,
} from "lucide-react";
import {
  Facebook,
  Instagram,
  TikTok,
  Twitter,
  WhatsApp,
} from "@workspace/icons";
import { getTeamOverviewData } from "./_lib/queries";
import {
  KeyStat,
  MedalStrip,
  NationalRecordsList,
  TeamPersonLink,
} from "./_components/team-profile-shared";

type Props = {
  params: Promise<{ stateId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const stateId = (await params).stateId;
  const team = await getTeam(stateId);

  return {
    title: `${team?.name} | Cubing México`,
    description: `${team?.name} es un equipo de ${team?.state} que compite en competencias de la World Cube Association.`,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ stateId: string }>;
}) {
  const stateId = (await params).stateId;
  const data = await getTeamOverviewData(stateId);

  if (!data) {
    return notFound();
  }

  const {
    team,
    medals,
    competitionsCount,
    activeYears,
    totalNationalRecords,
    nationalRecordsTeaser,
    topMembers,
    upcomingCompetitions,
  } = data;

  const socialLinks = [
    team.socialLinks?.email
      ? {
          key: "email",
          href: `mailto:${team.socialLinks.email}`,
          label: "Correo",
          icon: Mail,
          external: false,
        }
      : null,
    team.socialLinks?.whatsapp
      ? {
          key: "whatsapp",
          href: `https://wa.me/${team.socialLinks.whatsapp}`,
          label: "WhatsApp",
          icon: WhatsApp,
          external: true,
        }
      : null,
    team.socialLinks?.facebook
      ? {
          key: "facebook",
          href: team.socialLinks.facebook,
          label: "Facebook",
          icon: Facebook,
          external: true,
        }
      : null,
    team.socialLinks?.instagram
      ? {
          key: "instagram",
          href: team.socialLinks.instagram,
          label: "Instagram",
          icon: Instagram,
          external: true,
        }
      : null,
    team.socialLinks?.tiktok
      ? {
          key: "tiktok",
          href: team.socialLinks.tiktok,
          label: "TikTok",
          icon: TikTok,
          external: true,
        }
      : null,
    team.socialLinks?.twitter
      ? {
          key: "twitter",
          href: team.socialLinks.twitter,
          label: "Twitter",
          icon: Twitter,
          external: true,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    href: string;
    label: string;
    icon: ComponentType<{ className?: string }>;
    external: boolean;
  }>;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Logros del Team</h2>
            <p className="text-sm text-muted-foreground">
              Medallas y récords nacionales de sus miembros
            </p>
          </div>
          <Link
            href={`/teams/${stateId}/statistics`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-1.5",
            )}
          >
            <ChartNoAxesCombined className="h-4 w-4" />
            Ver estadísticas
          </Link>
        </div>

        <MedalStrip medals={medals} />

        <div
          className={
            activeYears > 0
              ? "grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
              : "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4"
          }
        >
          <KeyStat
            label="Podios totales"
            value={medals.total}
            href={`/teams/${stateId}/statistics`}
          />
          <KeyStat
            label="Récords nacionales"
            value={totalNationalRecords}
            href={`/teams/${stateId}/statistics`}
          />
          <KeyStat
            label="Competencias"
            value={competitionsCount}
            href={`/teams/${stateId}/competitions`}
          />
          {activeYears > 0 ? (
            <KeyStat label="Años activo" value={activeYears} />
          ) : null}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Acerca de</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {team.description ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {team.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Este team aún no tiene una descripción.
                </p>
              )}

              {socialLinks.length > 0 ? (
                <div className="flex flex-wrap gap-2 border-t pt-4">
                  {socialLinks.map((social) => {
                    const Icon = social.icon;
                    const className =
                      "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

                    if (social.external) {
                      return (
                        <Link
                          key={social.key}
                          href={social.href}
                          className={className}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Icon className="h-4 w-4" />
                          {social.label}
                        </Link>
                      );
                    }

                    return (
                      <a
                        key={social.key}
                        href={social.href}
                        className={className}
                      >
                        <Icon className="h-4 w-4" />
                        {social.label}
                      </a>
                    );
                  })}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <CardTitle>Miembros destacados</CardTitle>
              <Link
                href={`/teams/${stateId}/members`}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "gap-1",
                )}
              >
                Ver todos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardHeader>
            <CardContent>
              {topMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aún no hay podios registrados para este team.
                </p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {topMembers.map((member, index) => (
                    <li
                      key={member.wcaId}
                      className="flex items-center gap-3 px-3 py-2.5 text-sm"
                    >
                      <span className="w-5 text-center tabular-nums text-muted-foreground">
                        {index + 1}
                      </span>
                      <span className="min-w-0 grow truncate font-medium">
                        <TeamPersonLink
                          wcaId={member.wcaId}
                          name={member.name}
                        />
                      </span>
                      <span className="inline-flex items-center gap-1 tabular-nums text-muted-foreground">
                        <Medal className="h-3.5 w-3.5 text-amber-500" />
                        {member.podiums}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <CardTitle>Récords nacionales</CardTitle>
              <Link
                href={`/teams/${stateId}/statistics`}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "gap-1",
                )}
              >
                Ver todos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardHeader>
            <CardContent>
              <NationalRecordsList records={nationalRecordsTeaser} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <CardTitle>Próximas competencias</CardTitle>
              <Link
                href={`/teams/${stateId}/competitions`}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "gap-1",
                )}
              >
                Ver todas
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardHeader>
            <CardContent>
              {upcomingCompetitions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay competencias próximas
                </p>
              ) : (
                <div className="space-y-4">
                  {upcomingCompetitions.map((competition) => (
                    <div key={competition.id} className="space-y-1.5">
                      <h3 className="font-semibold leading-snug">
                        <Link
                          href={`/competitions/${competition.id}`}
                          className="text-link hover:text-link/80"
                        >
                          {competition.name}
                        </Link>
                      </h3>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 shrink-0" />
                          {competition.startDate.toLocaleDateString("es-ES", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            timeZone: "UTC",
                          })}
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                          <span className="line-clamp-2">
                            <ReactMarkdown
                              components={{
                                a: ({ children, href }) => (
                                  <Link
                                    className="hover:underline"
                                    href={href ?? ""}
                                    target="_blank"
                                  >
                                    {children}
                                  </Link>
                                ),
                                p: ({ children }) => <>{children}</>,
                              }}
                            >
                              {competition.venue}
                            </ReactMarkdown>
                            , {competition.cityName}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
