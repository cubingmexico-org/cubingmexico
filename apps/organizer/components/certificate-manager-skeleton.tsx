import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";

export function CertificateManagerSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-45" />
            <Skeleton className="h-4 w-37.5" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-2">
                <Skeleton className="h-4 w-4 shrink-0" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
            <Skeleton className="h-px w-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-25" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-16 rounded-md" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-50" />
            <Skeleton className="h-4 w-62.5" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-30" />
                    <Skeleton className="h-4 w-15" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </div>
            <div className="rounded-md bg-muted p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-4 w-30" />
                  <Skeleton className="h-3 w-20 mt-1" />
                </div>
                <Skeleton className="h-8 w-25" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="podium">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="podium" disabled>
            <Skeleton className="h-4 w-4 mr-2" />
            <Skeleton className="h-4 w-30" />
          </TabsTrigger>
          <TabsTrigger value="participation" disabled>
            <Skeleton className="h-4 w-4 mr-2" />
            <Skeleton className="h-4 w-37.5" />
          </TabsTrigger>
        </TabsList>

        <div className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-37.5" />
                <Skeleton className="h-4 w-50" />
              </CardHeader>
              <CardContent className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Skeleton className="h-9 w-30" />
                <Skeleton className="h-9 w-30" />
              </CardFooter>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-25" />
                  <Skeleton className="h-4 w-50" />
                </CardHeader>
                <CardContent className="flex justify-center">
                  <Skeleton className="aspect-[1.414/1] w-full max-w-md" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-25" />
                  <Skeleton className="h-4 w-45" />
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
