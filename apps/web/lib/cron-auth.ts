import { timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env";

/** True when the request carries `Authorization: Bearer $CRON_SECRET`, as the Flask backend sends. */
export function hasCronAuth(
  request: Request,
  cronSecret: string | undefined = serverEnv().CRON_SECRET,
): boolean {
  if (!cronSecret) return false;

  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return false;

  const expected = Buffer.from(cronSecret);
  const actual = Buffer.from(token);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
