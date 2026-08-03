import type { Event } from "@workspace/db/schema";
import {
  createLucideIcon,
  LucideProps,
  Timer,
  TimerOff,
  TimerReset,
} from "lucide-react";
import { ForwardRefExoticComponent, RefAttributes } from "react";

/**
 * Returns the appropriate status icon based on the provided status.
 * @param status - The status of the task.
 * @returns A React component representing the status icon.
 */
export function getEventsIcon(events: Event["id"]) {
  const eventsIcon = {
    "3x3x3 Cube": createLucideIcon("333", []),
    "2x2x2 Cube": createLucideIcon("222", []),
    "4x4x4 Cube": createLucideIcon("444", []),
    "5x5x5 Cube": createLucideIcon("555", []),
    "6x6x6 Cube": createLucideIcon("666", []),
    "7x7x7 Cube": createLucideIcon("777", []),
    "3x3x3 Blindfolded": createLucideIcon("333bf", []),
    "3x3x3 Fewest Moves": createLucideIcon("333fm", []),
    "3x3x3 One-Handed": createLucideIcon("333oh", []),
    Clock: createLucideIcon("clock", []),
    Megaminx: createLucideIcon("minx", []),
    Pyraminx: createLucideIcon("pyram", []),
    Skewb: createLucideIcon("skewb", []),
    "Square-1": createLucideIcon("sq1", []),
    "4x4x4 Blindfolded": createLucideIcon("444bf", []),
    "5x5x5 Blindfolded": createLucideIcon("555bf", []),
    "3x3x3 Multi-Blind": createLucideIcon("333mbf", []),
  } as Record<
    Event["id"],
    ForwardRefExoticComponent<
      Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
    >
  >;

  return eventsIcon[events];
}

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
