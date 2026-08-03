"use client";

import * as React from "react";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import { useRouter } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import {
  createSerializer,
  parseAsArrayOf,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
} from "nuqs";
import { person } from "@workspace/db/schema";

const searchParams = {
  name: parseAsString.withDefault(""),
  state: parseAsArrayOf(parseAsString).withDefault([]),
  gender: parseAsArrayOf(
    parseAsStringEnum(person.gender.enumValues),
  ).withDefault([]),
};
const serialize = createSerializer(searchParams);

interface RankTypeSelectorProps extends React.HTMLAttributes<HTMLDivElement> {
  selectedRankType: "single" | "average";
  className?: string;
}

export function RankTypeSelector({
  selectedRankType,
  className,
  ...props
}: RankTypeSelectorProps) {
  const router = useRouter();
  const [{ name, state, gender }] = useQueryStates(searchParams);
  const hrefSingle = serialize(`/sor/single`, {
    name,
    state,
    gender,
  });
  const hrefAverage = serialize(`/sor/average`, {
    name,
    state,
    gender,
  });

  return (
    <div className={cn("flex flex-col gap-2", className)} {...props}>
      <span className="font-semibold text-sm">Tipo</span>
      <ToggleGroup
        type="single"
        variant="outline"
        value={selectedRankType}
        className="w-full"
      >
        <ToggleGroupItem
          className="w-[50%]"
          value="single"
          aria-label="single"
          onClick={() => router.push(hrefSingle)}
        >
          Single
        </ToggleGroupItem>
        <ToggleGroupItem
          className="w-[50%]"
          value="average"
          aria-label="average"
          onClick={() => router.push(hrefAverage)}
        >
          Average
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
