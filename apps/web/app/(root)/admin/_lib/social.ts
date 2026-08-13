import "server-only";

export type SocialPostType =
  | "resultados"
  | "record"
  | "upcoming"
  | "summary_unlock"
  | "weekly_digest"
  | "streaks_monthly";

function backendConfig() {
  const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, "");
  const cronSecret = process.env.CRON_SECRET;
  if (!backendUrl || !cronSecret) {
    return null;
  }
  return { backendUrl, cronSecret };
}

function typePath(postType: SocialPostType): string {
  if (postType === "resultados") return "resultados";
  if (postType === "record") return "records";
  if (postType === "summary_unlock") return "summary-unlock";
  if (postType === "weekly_digest") return "weekly-digest";
  if (postType === "streaks_monthly") return "streaks-monthly";
  return "upcoming";
}

async function parseJsonBody(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { message: text };
  }
}

export async function fetchSocialImage(
  postType: SocialPostType,
  subjectKey: string,
): Promise<
  | { ok: true; bytes: ArrayBuffer; filename: string }
  | { ok: false; status: number; body: unknown }
> {
  const config = backendConfig();
  if (!config) {
    return {
      ok: false,
      status: 500,
      body: {
        error:
          "BACKEND_URL y CRON_SECRET deben estar configurados en el entorno.",
      },
    };
  }

  const response = await fetch(
    `${config.backendUrl}/social/${typePath(postType)}/${encodeURIComponent(subjectKey)}/image.png`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.cronSecret}`,
      },
    },
  );

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      body: await parseJsonBody(response),
    };
  }

  const bytes = await response.arrayBuffer();
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
              : "proxima";
  return {
    ok: true,
    bytes,
    filename: `${prefix}-${subjectKey.replace(/[:/]/g, "-")}.png`,
  };
}

export type WeeklyDigestSlideMeta = {
  index: number;
  id: string;
  title: string;
};

export async function fetchWeeklyDigestSlides(
  week: string,
): Promise<
  | { ok: true; slides: WeeklyDigestSlideMeta[]; count: number }
  | { ok: false; status: number; body: unknown }
> {
  const config = backendConfig();
  if (!config) {
    return {
      ok: false,
      status: 500,
      body: {
        error:
          "BACKEND_URL y CRON_SECRET deben estar configurados en el entorno.",
      },
    };
  }

  const response = await fetch(
    `${config.backendUrl}/social/weekly-digest/${encodeURIComponent(week)}/slides`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.cronSecret}`,
      },
    },
  );

  const body = await parseJsonBody(response);
  if (!response.ok) {
    return { ok: false, status: response.status, body };
  }

  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const rawSlides = Array.isArray(record?.slides) ? record.slides : [];
  const slides: WeeklyDigestSlideMeta[] = [];
  for (const item of rawSlides) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (
      typeof row.index !== "number" ||
      typeof row.id !== "string" ||
      typeof row.title !== "string"
    ) {
      continue;
    }
    slides.push({ index: row.index, id: row.id, title: row.title });
  }

  return {
    ok: true,
    slides,
    count: typeof record?.count === "number" ? record.count : slides.length,
  };
}

export async function fetchWeeklyDigestSlideImage(
  week: string,
  index: number,
): Promise<
  | { ok: true; bytes: ArrayBuffer; filename: string; slideId: string }
  | { ok: false; status: number; body: unknown }
> {
  const config = backendConfig();
  if (!config) {
    return {
      ok: false,
      status: 500,
      body: {
        error:
          "BACKEND_URL y CRON_SECRET deben estar configurados en el entorno.",
      },
    };
  }

  const response = await fetch(
    `${config.backendUrl}/social/weekly-digest/${encodeURIComponent(week)}/slides/${index}/image.png`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.cronSecret}`,
      },
    },
  );

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      body: await parseJsonBody(response),
    };
  }

  const bytes = await response.arrayBuffer();
  const slideId = response.headers.get("X-Slide-Id") || `slide-${index}`;
  return {
    ok: true,
    bytes,
    filename: `semana-${week.replace(/[:/]/g, "-")}-${slideId}.png`,
    slideId,
  };
}

export async function publishSocialPost(
  postType: SocialPostType,
  subjectKey: string,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const config = backendConfig();
  if (!config) {
    return {
      ok: false,
      status: 500,
      body: {
        error:
          "BACKEND_URL y CRON_SECRET deben estar configurados en el entorno.",
      },
    };
  }

  const response = await fetch(
    `${config.backendUrl}/social/${typePath(postType)}/${encodeURIComponent(subjectKey)}/publish`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.cronSecret}`,
        "Content-Type": "application/json",
      },
    },
  );

  return {
    ok: response.ok,
    status: response.status,
    body: await parseJsonBody(response),
  };
}

export async function markSocialPosted(
  postType: SocialPostType,
  subjectKey: string,
  platforms?: string[],
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const config = backendConfig();
  if (!config) {
    return {
      ok: false,
      status: 500,
      body: {
        error:
          "BACKEND_URL y CRON_SECRET deben estar configurados en el entorno.",
      },
    };
  }

  const response = await fetch(
    `${config.backendUrl}/social/${typePath(postType)}/${encodeURIComponent(subjectKey)}/mark`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.cronSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(platforms ? { platforms } : {}),
    },
  );

  return {
    ok: response.ok,
    status: response.status,
    body: await parseJsonBody(response),
  };
}

export async function fetchSocialCaption(
  postType: SocialPostType,
  subjectKey: string,
): Promise<
  | {
      ok: true;
      caption: string;
      facebookCaption: string;
      instagramCaption: string;
    }
  | { ok: false; status: number; body: unknown }
> {
  const config = backendConfig();
  if (!config) {
    return {
      ok: false,
      status: 500,
      body: {
        error:
          "BACKEND_URL y CRON_SECRET deben estar configurados en el entorno.",
      },
    };
  }

  const response = await fetch(
    `${config.backendUrl}/social/${typePath(postType)}/${encodeURIComponent(subjectKey)}/caption`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.cronSecret}`,
      },
    },
  );

  const body = await parseJsonBody(response);
  if (!response.ok) {
    return { ok: false, status: response.status, body };
  }

  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const facebookCaption =
    typeof record?.facebook_caption === "string"
      ? record.facebook_caption
      : typeof record?.caption === "string"
        ? record.caption
        : null;
  const instagramCaption =
    typeof record?.instagram_caption === "string"
      ? record.instagram_caption
      : facebookCaption;

  if (!facebookCaption || !instagramCaption) {
    return {
      ok: false,
      status: 502,
      body: { error: "Caption missing in backend response" },
    };
  }

  return {
    ok: true,
    caption: facebookCaption,
    facebookCaption,
    instagramCaption,
  };
}

/** @deprecated Prefer fetchSocialImage("resultados", id) */
export async function fetchResultadosImage(competitionId: string) {
  return fetchSocialImage("resultados", competitionId);
}

/** @deprecated Prefer publishSocialPost("resultados", id) */
export async function publishResultados(competitionId: string) {
  return publishSocialPost("resultados", competitionId);
}

/** @deprecated Prefer markSocialPosted("resultados", id, platforms) */
export async function markResultadosPosted(
  competitionId: string,
  platforms?: string[],
) {
  return markSocialPosted("resultados", competitionId, platforms);
}

/** @deprecated Prefer fetchSocialCaption("resultados", id) */
export async function fetchResultadosCaption(competitionId: string) {
  return fetchSocialCaption("resultados", competitionId);
}
