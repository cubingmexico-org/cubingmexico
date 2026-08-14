import { CompetitionModuleNav } from "@/components/competition-module-nav";
import { GroupsManager } from "@/components/groups/groups-manager";
import {
  getCompetitionById,
  getCompetitionLogoById,
  getWCIFByCompetitionId,
} from "@/db/queries";
import { isCompetitionToolsUnavailable } from "@/lib/competition-availability";
import { AlertCircle, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type Params = Promise<{ competitionId: string }>;

export default async function Page({
  params,
}: {
  params: Params;
}): Promise<React.JSX.Element> {
  const { competitionId } = await params;

  const competition = await getCompetitionById({
    id: competitionId,
  });

  if (!competition) {
    notFound();
  }

  if (isCompetitionToolsUnavailable(competition)) {
    return (
      <div className="relative border-2 border-amber-200 dark:border-amber-900/50 rounded-xl p-8 sm:p-10 shadow-lg bg-linear-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10 backdrop-blur-sm">
        <div className="absolute inset-0 bg-grid-amber-900/[0.02] dark:bg-grid-amber-100/[0.02] rounded-xl" />
        <div className="relative space-y-6">
          <CompetitionModuleNav competitionId={competitionId} />
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-3 ring-8 ring-amber-50 dark:ring-amber-900/20">
              <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-500" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-amber-700 to-orange-700 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
              Resultados no disponibles
            </h2>
          </div>

          <div className="space-y-5 text-base">
            <div className="rounded-lg bg-white/60 dark:bg-gray-900/40 p-5 border border-amber-100 dark:border-amber-900/30">
              <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                Los resultados de esta competencia se publicaron hace más de 1
                mes, por lo que ya no están disponibles en Grupos.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const wcif = await getWCIFByCompetitionId({
    competitionId,
  });

  const competitionLogoUrl = await getCompetitionLogoById(competitionId);

  if (!wcif) {
    return (
      <div className="relative border-2 border-amber-200 dark:border-amber-900/50 rounded-xl p-8 sm:p-10 shadow-lg bg-linear-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10 backdrop-blur-sm">
        <div className="absolute inset-0 bg-grid-amber-900/[0.02] dark:bg-grid-amber-100/[0.02] rounded-xl" />
        <div className="relative space-y-6">
          <CompetitionModuleNav competitionId={competitionId} />
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-3 ring-8 ring-amber-50 dark:ring-amber-900/20">
              <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-500" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-amber-700 to-orange-700 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
              WCIF no disponible
            </h2>
          </div>

          <div className="space-y-5 text-base">
            <div className="rounded-lg bg-white/60 dark:bg-gray-900/40 p-5 border border-amber-100 dark:border-amber-900/30">
              <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                No se pudo encontrar el WCIF para esta competencia. Por favor,
                asegúrate de que el WCIF esté disponible antes de usar Grupos.
              </p>
            </div>

            <div className="rounded-lg bg-linear-to-br from-blue-50/80 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 p-5 border border-blue-200 dark:border-blue-900/40">
              <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                Si eres el organizador de esta competencia, entra a{" "}
                <Link
                  href="https://live.worldcubeassociation.org/my-competitions"
                  className="inline-flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400 underline decoration-2 decoration-blue-300 dark:decoration-blue-600 underline-offset-4 hover:decoration-blue-600 dark:hover:decoration-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-200 hover:gap-2"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WCA Live
                  <ExternalLink className="h-4 w-4" />
                </Link>{" "}
                e importa la competencia para que el WCIF esté disponible.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <CompetitionModuleNav competitionId={competitionId} />
      <GroupsManager
        competition={competition}
        wcif={wcif}
        competitionLogoUrl={competitionLogoUrl}
      />
    </>
  );
}
