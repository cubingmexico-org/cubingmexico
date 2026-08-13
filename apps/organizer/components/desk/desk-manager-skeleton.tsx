import { Skeleton } from "@workspace/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";

export function DeskManagerSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Tabs defaultValue="staff">
        <TabsList>
          <TabsTrigger value="staff" disabled>
            Staff
          </TabsTrigger>
          <TabsTrigger value="registration" disabled>
            Inscripciones
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
