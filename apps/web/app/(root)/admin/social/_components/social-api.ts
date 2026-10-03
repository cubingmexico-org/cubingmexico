import type { CarouselPostType, SocialPostType } from "./social-types";

export function apiBase(postType: SocialPostType) {
  if (postType === "resultados") return "/api/admin/social/resultados";
  if (postType === "record") return "/api/admin/social/records";
  if (postType === "summary_unlock") return "/api/admin/social/summary-unlock";
  if (postType === "weekly_digest") return "/api/admin/social/weekly-digest";
  if (postType === "streaks_monthly")
    return "/api/admin/social/streaks-monthly";
  if (postType === "mollerz") return "/api/admin/social/mollerz";
  if (postType === "nemesis") return "/api/admin/social/nemesis";
  if (postType === "year_recap") return "/api/admin/social/year-recap";
  return "/api/admin/social/upcoming";
}

export async function downloadImage(
  postType: SocialPostType,
  subjectKey: string,
) {
  const response = await fetch(
    `${apiBase(postType)}/${encodeURIComponent(subjectKey)}/image`,
  );
  if (!response.ok) {
    let message = `Error HTTP ${response.status}`;
    try {
      const data = await response.json();
      message =
        data?.message || data?.data?.message || data?.data?.error || message;
    } catch {
      // ignore
    }
    throw new Error(String(message));
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const prefix =
    postType === "resultados"
      ? "resultados"
      : postType === "record"
        ? "record"
        : postType === "summary_unlock"
          ? "resumen"
          : postType === "weekly_digest"
            ? "semana"
            : postType === "streaks_monthly"
              ? "rachas"
              : postType === "mollerz"
                ? "mollerz"
                : postType === "nemesis"
                  ? "nemesis"
                  : postType === "year_recap"
                    ? "ano"
                    : "proxima";
  a.download = `${prefix}-${subjectKey.replace(/[:/]/g, "-")}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function fetchCaptions(
  postType: SocialPostType,
  subjectKey: string,
): Promise<{ facebookCaption: string; instagramCaption: string }> {
  const response = await fetch(
    `${apiBase(postType)}/${encodeURIComponent(subjectKey)}/caption`,
  );
  const data = await response.json();
  const facebookCaption =
    typeof data?.facebookCaption === "string"
      ? data.facebookCaption
      : typeof data?.caption === "string"
        ? data.caption
        : null;
  const instagramCaption =
    typeof data?.instagramCaption === "string"
      ? data.instagramCaption
      : facebookCaption;
  if (!response.ok || !data.success || !facebookCaption || !instagramCaption) {
    const message =
      data?.message ||
      data?.data?.message ||
      data?.data?.error ||
      `Error HTTP ${response.status}`;
    throw new Error(String(message));
  }
  return { facebookCaption, instagramCaption };
}

export async function fetchImageObjectUrl(
  postType: SocialPostType,
  subjectKey: string,
): Promise<string> {
  const response = await fetch(
    `${apiBase(postType)}/${encodeURIComponent(subjectKey)}/image`,
  );
  if (!response.ok) {
    let message = `Error HTTP ${response.status}`;
    try {
      const data = await response.json();
      message =
        data?.message || data?.data?.message || data?.data?.error || message;
    } catch {
      // ignore
    }
    throw new Error(String(message));
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function fetchCarouselSlidesManifest(
  postType: CarouselPostType,
  subjectKey: string,
): Promise<Array<{ index: number; id: string; title: string }>> {
  const response = await fetch(
    `${apiBase(postType)}/${encodeURIComponent(subjectKey)}/slides`,
  );
  const data = await response.json();
  if (!response.ok || !data.success || !Array.isArray(data.slides)) {
    const message =
      data?.message ||
      data?.data?.message ||
      data?.data?.error ||
      `Error HTTP ${response.status}`;
    throw new Error(String(message));
  }
  return data.slides as Array<{ index: number; id: string; title: string }>;
}

export async function fetchCarouselSlideObjectUrl(
  postType: CarouselPostType,
  subjectKey: string,
  index: number,
): Promise<string> {
  const response = await fetch(
    `${apiBase(postType)}/${encodeURIComponent(subjectKey)}/slides/${index}/image`,
  );
  if (!response.ok) {
    let message = `Error HTTP ${response.status}`;
    try {
      const data = await response.json();
      message =
        data?.message || data?.data?.message || data?.data?.error || message;
    } catch {
      // ignore
    }
    throw new Error(String(message));
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function downloadCarouselSlide(
  postType: CarouselPostType,
  subjectKey: string,
  index: number,
  slideId: string,
) {
  const response = await fetch(
    `${apiBase(postType)}/${encodeURIComponent(subjectKey)}/slides/${index}/image`,
  );
  if (!response.ok) {
    let message = `Error HTTP ${response.status}`;
    try {
      const data = await response.json();
      message =
        data?.message || data?.data?.message || data?.data?.error || message;
    } catch {
      // ignore
    }
    throw new Error(String(message));
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const prefix = postType === "year_recap" ? "ano" : "semana";
  a.download = `${prefix}-${subjectKey.replace(/[:/]/g, "-")}-${slideId}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
