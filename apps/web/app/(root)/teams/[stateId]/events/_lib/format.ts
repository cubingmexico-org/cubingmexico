import { eventNames } from "@/lib/constants";

export function formatShare(share: number | null): string {
  if (share === null) return "—";
  return `${(share * 100).toFixed(1)}%`;
}

export function eventLabel(eventId: string, fallback: string): string {
  return eventNames[eventId] ?? fallback;
}
