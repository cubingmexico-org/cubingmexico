import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";

export function BadgeManagerSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="overflow-hidden border-2 shadow-md hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="space-y-3 pb-4">
            <Skeleton className="h-7 w-45 rounded-lg" />
            <Skeleton className="h-4 w-37.5 rounded-md" />
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-5 w-5 shrink-0 rounded" />
                  <Skeleton className="h-5 w-full rounded-md" />
                </div>
              ))}
            </div>
            <Skeleton className="h-px w-full bg-linear-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-25 rounded-md" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-16 rounded-lg" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 overflow-hidden border-2 shadow-md hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="space-y-3 pb-4">
            <Skeleton className="h-7 w-50 rounded-lg" />
            <Skeleton className="h-4 w-62.5 rounded-md" />
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="space-y-3 rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-30 rounded-md" />
                    <Skeleton className="h-5 w-15 rounded-md" />
                  </div>
                  <Skeleton className="h-2.5 w-full rounded-full" />
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-linear-to-br from-muted/80 to-muted/40 p-5 shadow-inner">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-30 rounded-md" />
                  <Skeleton className="h-3 w-20 rounded-md" />
                </div>
                <Skeleton className="h-9 w-25 rounded-lg" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border-2 bg-card shadow-md p-1">
        <Tabs defaultValue="podium">
          <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-lg">
            <TabsTrigger value="podium" disabled className="gap-2 rounded-md">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-30 rounded-md" />
            </TabsTrigger>
            <TabsTrigger
              value="participation"
              disabled
              className="gap-2 rounded-md"
            >
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-37.5 rounded-md" />
            </TabsTrigger>
          </TabsList>

          <div className="pt-6 px-1 pb-1">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="overflow-hidden border-2 shadow-md">
                <CardHeader className="space-y-3 pb-4">
                  <Skeleton className="h-7 w-37.5 rounded-lg" />
                  <Skeleton className="h-4 w-50 rounded-md" />
                </CardHeader>
                <CardContent className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-11 w-full rounded-lg" />
                  ))}
                </CardContent>
                <CardFooter className="flex justify-between gap-3 pt-6">
                  <Skeleton className="h-10 w-30 rounded-lg" />
                  <Skeleton className="h-10 w-30 rounded-lg" />
                </CardFooter>
              </Card>

              <div className="space-y-6">
                <Card className="overflow-hidden border-2 shadow-md">
                  <CardHeader className="space-y-3 pb-4">
                    <Skeleton className="h-7 w-25 rounded-lg" />
                    <Skeleton className="h-4 w-50 rounded-md" />
                  </CardHeader>
                  <CardContent className="flex justify-center p-6">
                    <div className="relative w-full max-w-md">
                      <Skeleton className="aspect-[1.414/1] w-full rounded-xl shadow-lg" />
                      <div className="absolute inset-0 bg-linear-to-tr from-transparent via-white/10 to-white/20 dark:via-white/5 dark:to-white/10 rounded-xl" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-2 shadow-md">
                  <CardHeader className="space-y-3 pb-4">
                    <Skeleton className="h-7 w-25 rounded-lg" />
                    <Skeleton className="h-4 w-45 rounded-md" />
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      <Skeleton className="h-10 w-full rounded-lg" />
                      <Skeleton className="h-10 w-full rounded-lg" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
