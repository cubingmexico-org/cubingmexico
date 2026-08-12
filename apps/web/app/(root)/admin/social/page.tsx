import { Suspense } from "react";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  getPendingRecordPosts,
  getPendingResultadosCompetitions,
  getPendingUpcomingCompetitions,
  getSocialPostStats,
  getSocialPosts,
} from "../_lib/queries";
import { SocialAdminPanel } from "./_components/social-admin-panel";

async function SocialPostsContent() {
  const [posts, stats, pendingResultados, pendingRecords, pendingUpcoming] =
    await Promise.all([
      getSocialPosts(30),
      getSocialPostStats(),
      getPendingResultadosCompetitions(10),
      getPendingRecordPosts(10),
      getPendingUpcomingCompetitions(10),
    ]);

  return (
    <SocialAdminPanel
      pendingResultados={pendingResultados}
      pendingRecords={pendingRecords}
      pendingUpcoming={pendingUpcoming}
      posts={posts}
      stats={stats}
    />
  );
}

export default function AdminSocialPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      }
    >
      <SocialPostsContent />
    </Suspense>
  );
}
