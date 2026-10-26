import "server-only";

import { type AdminOpsPath } from "@/app/(root)/admin/_lib/ops-jobs";
import { postToBackend, type BackendResponse } from "@/lib/backend";

export function triggerBackendJob(
  path: AdminOpsPath,
): Promise<BackendResponse> {
  return postToBackend(path);
}
