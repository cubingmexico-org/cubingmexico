import type { PublishParticipationShareResponse } from "@/lib/certificates/share-schema";

export type PublishParticipationShareInput = {
  competitionId: string;
  registrantIds?: number[];
  background?: string;
};

export async function publishParticipationShare(
  input: PublishParticipationShareInput,
): Promise<PublishParticipationShareResponse> {
  const res = await fetch("/api/certificates/participation/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const json = (await res.json().catch(() => null)) as
    | PublishParticipationShareResponse
    | { error?: string }
    | null;

  if (!res.ok) {
    const message =
      json && "error" in json && typeof json.error === "string"
        ? json.error
        : "Error al publicar el enlace de certificados";
    throw new Error(message);
  }

  return json as PublishParticipationShareResponse;
}
