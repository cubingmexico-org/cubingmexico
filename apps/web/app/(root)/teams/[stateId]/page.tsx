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
import {
  Calendar,
  ChartNoAxesCombined,
  Clock,
  Mail,
  MapPin,
  Medal,
  Plus,
  Trophy,
  Users,
} from "lucide-react";
import {
  Facebook,
  Instagram,
  TikTok,
  Twitter,
  WhatsApp,
} from "@workspace/icons";
import { getTeamOverviewData } from "./_lib/queries";

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
    competitions,
    totalPodiums,
    totalNationalRecords,
    upcomingCompetitions,
  } = data;
  const activeYears = team.founded
    ? new Date().getFullYear() - new Date(team.founded).getFullYear()
    : 0;

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Acerca de</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{team.description}</p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              {team.socialLinks?.email ? (
                <a
                  href={`mailto:${team.socialLinks.email}`}
                  className="flex items-center text-sm text-muted-foreground hover:underline"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Correo electrónico
                </a>
              ) : null}
              {team.socialLinks?.whatsapp ? (
                <Link
                  href={`https://wa.me/${team.socialLinks.whatsapp}`}
                  className="flex items-center text-sm text-muted-foreground hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <WhatsApp className="mr-2 h-4 w-4" />
                  WhatsApp
                </Link>
              ) : null}
              {team.socialLinks?.facebook ? (
                <Link
                  href={team.socialLinks.facebook}
                  className="flex items-center text-sm text-muted-foreground hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Facebook className="mr-2 h-4 w-4" />
                  Facebook
                </Link>
              ) : null}
              {team.socialLinks?.instagram ? (
                <Link
                  href={team.socialLinks.instagram}
                  className="flex items-center text-sm text-muted-foreground hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Instagram className="mr-2 h-4 w-4" />
                  Instagram
                </Link>
              ) : null}
              {team.socialLinks?.tiktok ? (
                <Link
                  href={team.socialLinks.tiktok}
                  className="flex items-center text-sm text-muted-foreground hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <TikTok className="mr-2 h-4 w-4" />
                  TikTok
                </Link>
              ) : null}
              {team.socialLinks?.twitter ? (
                <Link
                  href={team.socialLinks.twitter}
                  className="flex items-center text-sm text-muted-foreground hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Twitter className="mr-2 h-4 w-4" />
                  Twitter
                </Link>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Estadísticas del Team</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Medal className="mr-2 h-4 w-4 text-yellow-500" />
                  Total de podios
                </div>
                <span className="font-semibold">{totalPodiums.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Trophy className="mr-2 h-4 w-4 text-yellow-500" />
                  Récords nacionales
                </div>
                <span className="font-semibold">{totalNationalRecords}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  Competencias
                </div>
                <span className="font-semibold">{competitions.length}</span>
              </div>
              {activeYears > 0 ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4" />
                    Años activo
                  </div>
                  <span className="font-semibold">{activeYears}</span>
                </div>
              ) : null}
              <div className="mt-3 border-t pt-3">
                <div className="mb-2 text-sm font-medium">Ver más:</div>
                <div className="flex flex-col space-y-2">
                  <Link
                    href={`/rankings/333/single?state=${encodeURIComponent(team.state ?? "")}`}
                    className="flex items-center text-sm text-blue-600 hover:underline"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Rankings de {team.state}
                  </Link>
                  <Link
                    href={`/records?state=${encodeURIComponent(team.state ?? "")}`}
                    className="flex items-center text-sm text-blue-600 hover:underline"
                  >
                    <Trophy className="mr-2 h-4 w-4" />
                    Récords de {team.state}
                  </Link>
                  <Link
                    href={`/sor/single?state=${encodeURIComponent(team.state ?? "")}`}
                    className="flex items-center text-sm text-blue-600 hover:underline"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Sum of Ranks de {team.state}
                  </Link>
                  <Link
                    href={`/sosr/${stateId}/single`}
                    className="flex items-center text-sm text-blue-600 hover:underline"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Sum of State Ranks de {team.state}
                  </Link>
                  <Link
                    href={`/kinch/${stateId}`}
                    className="flex items-center text-sm text-blue-600 hover:underline"
                  >
                    <ChartNoAxesCombined className="mr-2 h-4 w-4" />
                    Kinch Ranks de {team.state}
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximas competencias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingCompetitions.length === 0 ? (
                <p className="text-muted-foreground">
                  No hay competencias próximas
                </p>
              ) : null}
              {upcomingCompetitions.map((competition) => (
                <div key={competition.id} className="space-y-2">
                  <h3 className="font-semibold">
                    <Link
                      href={`/competitions/${competition.id}`}
                      className="text-link hover:text-link/80"
                    >
                      {competition.name}
                    </Link>
                  </h3>
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4" />
                      {competition.startDate.toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        timeZone: "UTC",
                      })}
                    </div>
                    <div className="mt-1 flex items-center">
                      <MapPin className="mr-2 h-4 w-4" />
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
                        }}
                      >
                        {competition.venue}
                      </ReactMarkdown>
                      , {competition.cityName}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
