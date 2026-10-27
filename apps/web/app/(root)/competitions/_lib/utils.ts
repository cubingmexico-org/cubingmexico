import { Timer, TimerOff, TimerReset } from "lucide-react";

export function formatStatusName(str: "past" | "in_progress" | "upcoming") {
  const enumValues = {
    past: "Pasadas",
    in_progress: "En progreso",
    upcoming: "Próximas",
  };

  return enumValues[str as keyof typeof enumValues];
}

/**
 * Returns the appropriate status icon based on the provided status.
 * @param status - The status of the task.
 * @returns A React component representing the status icon.
 */
export function getStatusIcon(status: "past" | "in_progress" | "upcoming") {
  const statusIcons = {
    in_progress: Timer,
    past: TimerOff,
    upcoming: TimerReset,
  };

  return statusIcons[status];
}
