import type { JSONContent } from "@tiptap/react";
import type { Margins, PageOrientation, PageSize } from "pdfmake/interfaces";
import {
  EMAIL_BATCH_MAX,
  type ParticipationEmailResponse,
} from "@/lib/certificates/requests";

export type SendParticipationEmailsInput = {
  competitionId: string;
  registrantIds: number[];
  content: JSONContent;
  pageMargins: Margins;
  pageOrientation: PageOrientation;
  pageSize: PageSize;
  background?: string;
  onProgress?: (done: number, total: number) => void;
};

export type SendParticipationEmailsResult = {
  sent: number;
  failed: { registrantId: number; error: string }[];
  skippedNoEmail: number[];
  dailyQuotaHit: boolean;
  monthlyQuotaHit: boolean;
};

async function postBatch(
  body: Record<string, unknown>,
): Promise<ParticipationEmailResponse> {
  const res = await fetch("/api/certificates/participation/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => null)) as
    | ParticipationEmailResponse
    | { error?: string }
    | null;

  if (!res.ok) {
    const message =
      json && "error" in json && typeof json.error === "string"
        ? json.error
        : "Error al enviar los certificados";
    throw new Error(message);
  }

  return json as ParticipationEmailResponse;
}

/** Sends selected certificates in server batches of EMAIL_BATCH_MAX. */
export async function sendParticipationEmails(
  input: SendParticipationEmailsInput,
): Promise<SendParticipationEmailsResult> {
  const total = input.registrantIds.length;
  const result: SendParticipationEmailsResult = {
    sent: 0,
    failed: [],
    skippedNoEmail: [],
    dailyQuotaHit: false,
    monthlyQuotaHit: false,
  };

  let processed = 0;
  for (let i = 0; i < input.registrantIds.length; i += EMAIL_BATCH_MAX) {
    const batch = input.registrantIds.slice(i, i + EMAIL_BATCH_MAX);
    const batchResult = await postBatch({
      competitionId: input.competitionId,
      registrantIds: batch,
      content: input.content,
      pageMargins: input.pageMargins,
      pageOrientation: input.pageOrientation,
      pageSize: input.pageSize,
      background: input.background,
    });

    result.sent += batchResult.sent;
    result.failed.push(...batchResult.failed);
    result.skippedNoEmail.push(...batchResult.skippedNoEmail);
    processed += batch.length;
    input.onProgress?.(Math.min(processed, total), total);

    if (batchResult.dailyQuotaHit) {
      result.dailyQuotaHit = true;
      break;
    }
    if (batchResult.monthlyQuotaHit) {
      result.monthlyQuotaHit = true;
      break;
    }
  }

  return result;
}
