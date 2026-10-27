import { isStateId } from "@/lib/state-flags";
import { parseWcaId } from "@/lib/wca-id";

// Server action arguments arrive from the network, so they're typed `unknown` here.

const EVENT_ID_PATTERN = /^[a-z0-9]{2,10}$/;

export function requireWcaId(value: unknown): string {
  const wcaId = typeof value === "string" ? parseWcaId(value) : null;
  if (!wcaId) throw new Error("Invalid WCA ID");
  return wcaId;
}

export function requireStateId(value: unknown): string {
  if (typeof value !== "string" || !isStateId(value)) {
    throw new Error("Invalid state id");
  }
  return value;
}

export function requireEventId(value: unknown): string {
  if (typeof value !== "string" || !EVENT_ID_PATTERN.test(value)) {
    throw new Error("Invalid event id");
  }
  return value;
}
