import { Suspense } from "react";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  getPendingResultadosCompetitions,
  getSocialPostStats,
  getSocialPosts,
} from "../_lib/queries";
import { SocialAdminPanel } from "./_components/social-admin-panel";

async function SocialPostsContent() {
  const [posts, stats, pending] = await Promise.all([
    getSocialPosts(10),
    getSocialPostStats(),
    getPendingResultadosCompetitions(10),
  ]);

  return <SocialAdminPanel pending={pending} posts={posts} stats={stats} />;
}

export default function AdminSocialPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
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
