import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";

export default function Loading() {
  return (
    <main className="min-h-[calc(100vh-4rem)] animate-in fade-in duration-500">
      <div className="relative overflow-hidden bg-linear-to-b from-primary/5 via-primary/10 to-background py-16 sm:py-20">
        <div className="absolute inset-0 bg-grid-slate-900/[0.04] bg-size-[20px_20px]" />
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-muted p-1">
            <TabsTrigger value="upcoming" disabled className="flex-1 gap-2">
              <span className="hidden sm:inline">📅</span>
              <Skeleton className="h-4 w-16 rounded-md" />
              <Skeleton className="ml-1.5 h-5 w-6 rounded-full" />
            </TabsTrigger>
            <TabsTrigger value="ongoing" disabled className="flex-1 gap-2">
              <span className="hidden sm:inline">🎯</span>
              <Skeleton className="h-4 w-18 rounded-md" />
              <Skeleton className="ml-1.5 h-5 w-6 rounded-full" />
            </TabsTrigger>
            <TabsTrigger value="past" disabled className="flex-1 gap-2">
              <span className="hidden sm:inline">📚</span>
              <Skeleton className="h-4 w-16 rounded-md" />
              <Skeleton className="ml-1.5 h-5 w-6 rounded-full" />
            </TabsTrigger>
          </TabsList>

          <div className="mt-8">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card
                  key={i}
                  className="overflow-hidden border-2 shadow-md transition-shadow duration-300 hover:shadow-lg"
                >
                  <CardHeader className="space-y-3 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <Skeleton className="h-7 w-full max-w-50 rounded-lg" />
                      <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <Skeleton className="mt-0.5 h-4 w-4 shrink-0 rounded" />
                        <Skeleton className="h-4 w-full max-w-45 rounded-md" />
                      </div>
                      <div className="flex items-start gap-2">
                        <Skeleton className="mt-0.5 h-4 w-4 shrink-0 rounded" />
                        <Skeleton className="h-4 w-full max-w-50 rounded-md" />
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {Array.from({ length: 8 }).map((_, j) => (
                          <Skeleton key={j} className="h-5 w-5 rounded" />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2 pt-4">
                    <Skeleton className="h-9 flex-1 rounded-lg" />
                    <Skeleton className="h-9 flex-1 rounded-lg" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </Tabs>
      </div>
    </main>
  );
}
