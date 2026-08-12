"use client";

import * as React from "react";
import { RankTypeSelector as SharedRankTypeSelector } from "@/components/rank-type-selector";
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
    <SharedRankTypeSelector
      selectedRankType={selectedRankType}
      hrefSingle={hrefSingle}
      hrefAverage={hrefAverage}
      className={className}
      {...props}
    />
  );
}
