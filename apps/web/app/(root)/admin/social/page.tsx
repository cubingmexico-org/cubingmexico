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

const PAGE_SIZE = 30;

async function SocialPostsContent({
  searchParams,
}: {
  searchParams: Promise<{ older?: string; tab?: string; page?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab === "historial" ? "historial" : "pendientes";
  const includeOlder = params.older === "1";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const stats = await getSocialPostStats();

  if (tab === "historial") {
    const { rows: posts, total: postsTotal } = await getSocialPosts({
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });

    return (
      <SocialAdminPanel
        tab="historial"
        page={page}
        pageSize={PAGE_SIZE}
        posts={posts}
        postsTotal={postsTotal}
        stats={stats}
        pendingResultados={[]}
        pendingRecords={[]}
        pendingUpcoming={[]}
        pendingSummaryUnlock={[]}
        pendingWeeklyDigest={[]}
        pendingStreaksMonthly={[]}
      />
    );
  }

  const [
    pendingResultados,
    pendingRecords,
    pendingUpcoming,
    pendingSummaryUnlock,
    pendingWeeklyDigest,
    pendingStreaksMonthly,
  ] = await Promise.all([
    getPendingResultadosCompetitions(10, { includeOlder }),
    getPendingRecordPosts(10, { includeOlder }),
    getPendingUpcomingCompetitions(10),
    getPendingSummaryUnlockPosts(),
    getPendingWeeklyDigestPosts(),
    getPendingStreaksMonthlyPosts(),
  ]);

  return (
    <SocialAdminPanel
      tab="pendientes"
      includeOlder={includeOlder}
      pendingResultados={pendingResultados}
      pendingRecords={pendingRecords}
      pendingUpcoming={pendingUpcoming}
      pendingSummaryUnlock={pendingSummaryUnlock}
      pendingWeeklyDigest={pendingWeeklyDigest}
      pendingStreaksMonthly={pendingStreaksMonthly}
      posts={[]}
      postsTotal={0}
      page={1}
      pageSize={PAGE_SIZE}
      stats={stats}
    />
  );
}

export default function AdminSocialPage({
  searchParams,
}: {
  searchParams: Promise<{ older?: string; tab?: string; page?: string }>;
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
