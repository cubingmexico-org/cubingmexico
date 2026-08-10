import "server-only";

import { type AdminOpsPath } from "@/app/(root)/admin/_lib/ops-jobs";

export async function triggerBackendJob(path: AdminOpsPath): Promise<{
  ok: boolean;
  status: number;
  body: unknown;
}> {
  const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, "");
  const cronSecret = process.env.CRON_SECRET;

  if (!backendUrl || !cronSecret) {
    return {
      ok: false,
      status: 500,
      body: {
        error:
          "BACKEND_URL y CRON_SECRET deben estar configurados en el entorno.",
      },
    };
  }

  const response = await fetch(`${backendUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
      "Content-Type": "application/json",
    },
  });

  let body: unknown;
  const text = await response.text();
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { message: text };
  }

  return {
    ok: response.ok,
    status: response.status,
    body,
  };
}
