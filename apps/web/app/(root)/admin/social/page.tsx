import { Suspense } from "react";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  getPendingRecordPosts,
  getPendingResultadosCompetitions,
  getPendingStreaksMonthlyPosts,
  getPendingSummaryUnlockPosts,
  getPendingUpcomingCompetitions,
  getPendingWeeklyDigestPosts,
  getSocialPostStats,
  getSocialPosts,
} from "../_lib/queries";
import { SocialAdminPanel } from "./_components/social-admin-panel";

async function SocialPostsContent({
  searchParams,
}: {
  searchParams: Promise<{ older?: string }>;
}) {
  const params = await searchParams;
  const includeOlder = params.older === "1";

  const [
    posts,
    stats,
    pendingResultados,
    pendingRecords,
    pendingUpcoming,
    pendingSummaryUnlock,
    pendingWeeklyDigest,
    pendingStreaksMonthly,
  ] = await Promise.all([
    getSocialPosts(30),
    getSocialPostStats(),
    getPendingResultadosCompetitions(10, { includeOlder }),
    getPendingRecordPosts(10, { includeOlder }),
    getPendingUpcomingCompetitions(10),
    getPendingSummaryUnlockPosts(),
    getPendingWeeklyDigestPosts(),
    getPendingStreaksMonthlyPosts(),
  ]);

  return (
    <SocialAdminPanel
      includeOlder={includeOlder}
      pendingResultados={pendingResultados}
      pendingRecords={pendingRecords}
      pendingUpcoming={pendingUpcoming}
      pendingSummaryUnlock={pendingSummaryUnlock}
      pendingWeeklyDigest={pendingWeeklyDigest}
      pendingStreaksMonthly={pendingStreaksMonthly}
      posts={posts}
      stats={stats}
    />
  );
}

export default function AdminSocialPage({
  searchParams,
}: {
  searchParams: Promise<{ older?: string }>;
}) {
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
      <SocialPostsContent searchParams={searchParams} />
    </Suspense>
  );
}
