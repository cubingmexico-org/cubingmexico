"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import type { PersonStateGuessConfidence } from "../../_lib/queries";

export type ConfidenceFilterValue = PersonStateGuessConfidence | "all";

export function ConfidenceFilter({
  selected,
}: {
  selected: ConfidenceFilterValue;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <div className="space-y-2">
      <Label htmlFor="confidence-filter">Confianza</Label>
      <Select
        value={selected}
        onValueChange={(value) => {
          const params = new URLSearchParams(searchParams.toString());
          if (value === "high") {
            params.delete("confidence");
          } else {
            params.set("confidence", value);
          }
          const query = params.toString();
          router.push(query ? `/admin/people?${query}` : "/admin/people");
        }}
      >
        <SelectTrigger id="confidence-filter" className="w-full max-w-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="high">Alta</SelectItem>
          <SelectItem value="medium">Media</SelectItem>
          <SelectItem value="none">Baja</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
