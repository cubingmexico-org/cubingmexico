export type SocialPostType =
  | "resultados"
  | "record"
  | "upcoming"
  | "summary_unlock"
  | "weekly_digest"
  | "streaks_monthly"
  | "mollerz"
  | "nemesis"
  | "year_recap";

export type CarouselPostType = "weekly_digest" | "year_recap";

export function isCarouselPostType(
  postType: SocialPostType,
): postType is CarouselPostType {
  return postType === "weekly_digest" || postType === "year_recap";
}

export type PendingResultadosRow = {
  id: string;
  subjectKey: string;
  name: string;
  cityName: string;
  endDate: Date | string;
  facebookPosted: boolean;
  instagramPosted: boolean;
};

export type PendingRecordRow = {
  subjectKey: string;
  personId: string;
  personName: string;
  stateName: string | null;
  eventName: string;
  eventId: string;
  kind: string;
  level: string;
  value: number;
  competitionId: string | null;
  competitionName: string | null;
  facebookPosted: boolean;
  instagramPosted: boolean;
};

export type PendingUpcomingRow = {
  id: string;
  subjectKey: string;
  name: string;
  cityName: string;
  startDate: Date | string;
  stateName: string | null;
  facebookPosted: boolean;
  instagramPosted: boolean;
};

export type PendingSummaryUnlockRow = {
  subjectKey: string;
  year: number;
  facebookPosted: boolean;
  instagramPosted: boolean;
};

export type PendingWeeklyDigestRow = {
  subjectKey: string;
  weekKey: string;
  facebookPosted: boolean;
  instagramPosted: boolean;
};

export type PendingStreaksMonthlyRow = {
  subjectKey: string;
  monthKey: string;
  facebookPosted: boolean;
  instagramPosted: boolean;
};

export type PendingYearRecapRow = {
  subjectKey: string;
  year: number;
  facebookPosted: boolean;
  instagramPosted: boolean;
};

export type PendingMollerzRow = {
  subjectKey: string;
  personId: string;
  personName: string;
  stateName: string | null;
  tier: string;
  isNewMember: boolean;
  facebookPosted: boolean;
  instagramPosted: boolean;
};

export type PendingNemesisRow = {
  subjectKey: string;
  personId: string;
  personName: string;
  stateName: string | null;
  eventCount: number;
  nemesizedCount: number;
  facebookPosted: boolean;
  instagramPosted: boolean;
};

export type SocialPostRow = {
  id: string;
  postType: string;
  subjectKey: string;
  competitionId: string | null;
  competitionName: string | null;
  cityName: string | null;
  platform: string;
  externalId: string | null;
  postedAt: Date | string | null;
};

export type SocialPostStats = {
  total: number;
  competitions: number;
  facebook: number;
  instagram: number;
  resultados: number;
  records: number;
  upcoming: number;
  summaryUnlock: number;
  weeklyDigest: number;
  streaksMonthly: number;
  mollerz: number;
  nemesis: number;
  yearRecap: number;
};

export type ConfirmAction = {
  postType: SocialPostType;
  subjectKey: string;
  name: string;
  action: "publish" | "mark" | "delete";
  postId?: string;
  platform?: string;
};

export type PreviewTarget = {
  postType: SocialPostType;
  subjectKey: string;
  name: string;
};

export type PreviewSlide = {
  index: number;
  id: string;
  title: string;
  imageUrl: string;
};

export type PreviewData = {
  imageUrl: string;
  facebookCaption: string;
  instagramCaption: string;
  slides?: PreviewSlide[];
};
