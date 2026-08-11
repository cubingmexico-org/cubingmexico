import type { Metadata } from "next";
import Link from "next/link";
import { getTeam } from "@/db/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { buttonVariants } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { CalendarRange, Clock, Medal, Trophy, Users } from "lucide-react";
import { ANNUAL_SUMMARY_ENABLED } from "@/lib/constants";
import { getDefaultSummaryYear } from "@/app/(root)/summary/_lib/summary-year";
import { getStatisticsPageData } from "./_lib/queries";

type Props = {
  params: Promise<{ stateId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const stateId = (await params).stateId;
  const team = await getTeam(stateId);

  return {
    title: `${team?.name} | Estadísticas | Cubing México`,
    description: `${team?.name} es un equipo de ${team?.state} que compite en competencias de la World Cube Association.`,
  };
}

export default async function Page(props: {
  params: Promise<{ stateId: string }>;
}) {
  const stateId = (await props.params).stateId;
  const data = await getStatisticsPageData(stateId);

  if (!data) {
    return null;
  }

  const {
    team,
    competitions,
    totalPodiums,
    totalNationalRecords,
    activeYears,
  } = data;

  const summaryYear = getDefaultSummaryYear();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle>Estadísticas</CardTitle>
        {ANNUAL_SUMMARY_ENABLED ? (
          <Link
            href={`/summary/team/${summaryYear}/${stateId}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <CalendarRange />
            Resumen anual {summaryYear}
          </Link>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center">
              <Medal className="mr-3 h-5 w-5 text-yellow-500" />
              <div>
                <div className="font-semibold">Total de podios</div>
                <div className="text-sm text-muted-foreground">
                  A lo largo de la historia
                </div>
              </div>
            </div>
            <div className="text-2xl font-bold">{totalPodiums.length}</div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center">
              <Trophy className="mr-3 h-5 w-5 text-yellow-500" />
              <div>
                <div className="font-semibold">Récords nacionales</div>
                <div className="text-sm text-muted-foreground">
                  Récords nacionales actuales
                </div>
              </div>
            </div>
            <div className="text-2xl font-bold">{totalNationalRecords}</div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center">
              <Users className="mr-3 h-5 w-5" />
              <div>
                <div className="font-semibold">Competencias organizadas</div>
                <div className="text-sm text-muted-foreground">
                  Total de competencias en {team.state}
                </div>
              </div>
            </div>
            <div className="text-2xl font-bold">{competitions.length}</div>
          </div>
          {activeYears > 0 ? (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center">
                <Clock className="mr-3 h-5 w-5" />
                <div>
                  <div className="font-semibold">Años activo</div>
                  <div className="text-sm text-muted-foreground">
                    Desde la fundación del team
                  </div>
                </div>
              </div>
              <div className="text-2xl font-bold">{activeYears}</div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
