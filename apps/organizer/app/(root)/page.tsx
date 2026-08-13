import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import "@cubing/icons";
import { getCompetitionsManagedByUser } from "@/db/queries";
import { CompetitionList } from "@/components/competition-list";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function Page(): Promise<React.JSX.Element> {
  const headersList = await headers();

  const tokenData = await auth.api.getAccessToken({
    body: {
      providerId: "wca",
    },
    headers: headersList,
  });

  const competitions = await getCompetitionsManagedByUser({
    token: tokenData?.accessToken || "",
  });

  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
  }).format(new Date());

  const upcomingCompetitions = competitions.filter(
    (competition) => competition.start_date > todayStr,
  );
  const onGoingCompetitions = competitions.filter(
    (competition) =>
      competition.start_date <= todayStr && competition.end_date >= todayStr,
  );
  const pastCompetitions = competitions.filter(
    (competition) => competition.end_date < todayStr,
  );

  return (
    <main className="min-h-[calc(100vh-4rem)]">
      <div className="relative overflow-hidden bg-linear-to-b from-primary/5 via-primary/10 to-background py-16 sm:py-20">
        <div className="absolute inset-0 bg-grid-slate-900/[0.04] bg-size-[20px_20px]" />
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
            <TabsTrigger
              value="upcoming"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex-1"
            >
              <span className="hidden sm:inline">📅</span>
              Próximas
              <span className="ml-1.5 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-semibold text-green-600 dark:text-green-400">
                {upcomingCompetitions.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="ongoing"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex-1"
            >
              <span className="hidden sm:inline">🎯</span>
              En Curso
              <span className="ml-1.5 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                {onGoingCompetitions.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="past"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex-1"
            >
              <span className="hidden sm:inline">📚</span>
              Pasadas
              <span className="ml-1.5 rounded-full bg-slate-500/10 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                {pastCompetitions.length}
              </span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="mt-8">
            <CompetitionList
              competitions={upcomingCompetitions}
              status="upcoming"
            />
          </TabsContent>
          <TabsContent value="ongoing" className="mt-8">
            <CompetitionList
              competitions={onGoingCompetitions}
              status="ongoing"
            />
          </TabsContent>
          <TabsContent value="past" className="mt-8">
            <CompetitionList competitions={pastCompetitions} status="past" />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
