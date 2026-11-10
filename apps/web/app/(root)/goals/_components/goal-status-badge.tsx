import { Badge } from "@workspace/ui/components/badge";
import { Check, Clock, X } from "lucide-react";

export type GoalStatus = "achieved" | "missed" | "pending";

export function goalStatus(achieved: boolean, yearClosed: boolean): GoalStatus {
  if (achieved) return "achieved";
  return yearClosed ? "missed" : "pending";
}

export function GoalStatusBadge({ status }: { status: GoalStatus }) {
  switch (status) {
    case "achieved":
      return (
        <Badge className="bg-green-600 text-white">
          <Check />
          Cumplida
        </Badge>
      );
    case "missed":
      return (
        <Badge variant="secondary">
          <X />
          No cumplida
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="outline">
          <Clock />
          En progreso
        </Badge>
      );
  }
}
