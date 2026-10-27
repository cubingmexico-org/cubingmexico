import "server-only";

/** Pending posts due on a date: RESUMEN, SEMANA, RACHAS and AÑO. */

import {
  streaksMonthlyKeyIfDue,
  yearRecapKeyForAdmin,
} from "@/lib/social-calendar-mx";
import { db } from "@workspace/db";
import { socialPost } from "@workspace/db/schema";
import { isSummaryYearPublished } from "@/app/(root)/summary/_lib/summary-year";
import { and, eq } from "drizzle-orm";

export async function getPendingSummaryUnlockPosts(): Promise<
  Array<{
    subjectKey: string;
    year: number;
    facebookPosted: boolean;
    instagramPosted: boolean;
  }>
> {
  const year = new Date().getUTCFullYear();
  if (!isSummaryYearPublished(year)) {
    return [];
  }

  const subjectKey = String(year);
  const rows = await db
    .select({
      platform: socialPost.platform,
    })
    .from(socialPost)
    .where(
      and(
        eq(socialPost.postType, "summary_unlock"),
        eq(socialPost.subjectKey, subjectKey),
      ),
    );

  const facebookPosted = rows.some((row) => row.platform === "facebook");
  const instagramPosted = rows.some((row) => row.platform === "instagram");
  if (facebookPosted && instagramPosted) {
    return [];
  }

  return [
    {
      subjectKey,
      year,
      facebookPosted,
      instagramPosted,
    },
  ];
}

function mexicoCityYmd(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function isoWeekKeyFromYmd(ymd: string): string {
  const [year = 0, month = 0, day = 0] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const isoYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const weekNo = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return `${isoYear}-W${String(weekNo).padStart(2, "0")}`;
}

export async function getPendingWeeklyDigestPosts(): Promise<
  Array<{
    subjectKey: string;
    weekKey: string;
    facebookPosted: boolean;
    instagramPosted: boolean;
  }>
> {
  const subjectKey = isoWeekKeyFromYmd(mexicoCityYmd());
  const rows = await db
    .select({
      platform: socialPost.platform,
    })
    .from(socialPost)
    .where(
      and(
        eq(socialPost.postType, "weekly_digest"),
        eq(socialPost.subjectKey, subjectKey),
      ),
    );

  const facebookPosted = rows.some((row) => row.platform === "facebook");
  const instagramPosted = rows.some((row) => row.platform === "instagram");
  if (facebookPosted && instagramPosted) {
    return [];
  }

  return [
    {
      subjectKey,
      weekKey: subjectKey,
      facebookPosted,
      instagramPosted,
    },
  ];
}

export async function getPendingStreaksMonthlyPosts(): Promise<
  Array<{
    subjectKey: string;
    monthKey: string;
    facebookPosted: boolean;
    instagramPosted: boolean;
  }>
> {
  const subjectKey = streaksMonthlyKeyIfDue();
  if (!subjectKey) {
    return [];
  }
  const rows = await db
    .select({
      platform: socialPost.platform,
    })
    .from(socialPost)
    .where(
      and(
        eq(socialPost.postType, "streaks_monthly"),
        eq(socialPost.subjectKey, subjectKey),
      ),
    );

  const facebookPosted = rows.some((row) => row.platform === "facebook");
  const instagramPosted = rows.some((row) => row.platform === "instagram");
  if (facebookPosted && instagramPosted) {
    return [];
  }

  return [
    {
      subjectKey,
      monthKey: subjectKey,
      facebookPosted,
      instagramPosted,
    },
  ];
}

export async function getPendingYearRecapPosts(): Promise<
  Array<{
    subjectKey: string;
    year: number;
    facebookPosted: boolean;
    instagramPosted: boolean;
  }>
> {
  const year = yearRecapKeyForAdmin();
  if (year === null) {
    return [];
  }
  const subjectKey = String(year);
  const rows = await db
    .select({
      platform: socialPost.platform,
    })
    .from(socialPost)
    .where(
      and(
        eq(socialPost.postType, "year_recap"),
        eq(socialPost.subjectKey, subjectKey),
      ),
    );

  const facebookPosted = rows.some((row) => row.platform === "facebook");
  const instagramPosted = rows.some((row) => row.platform === "instagram");
  if (facebookPosted && instagramPosted) {
    return [];
  }

  return [
    {
      subjectKey,
      year,
      facebookPosted,
      instagramPosted,
    },
  ];
}
