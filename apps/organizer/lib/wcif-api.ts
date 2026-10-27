import { wcaUrl } from "@workspace/wca";
import { WCIF_VERSION } from "@/types/wcif";

export { WCIF_VERSION };

export function wcifLatestUrl(competitionId: string): string {
  return wcaUrl(`/api/v0/competitions/${competitionId}/wcif/latest`);
}

export function wcifCheckUrl(): string {
  return wcaUrl("/api/v0/competitions/wcif/check");
}

export function wcifPatchUrl(competitionId: string): string {
  return wcaUrl(`/api/v0/competitions/${competitionId}/wcif`);
}
