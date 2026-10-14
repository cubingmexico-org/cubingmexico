"use client";

import * as React from "react";
import { RankTypeSelector as SharedRankTypeSelector } from "@/components/rank-type-selector";
import {
  createSerializer,
  parseAsArrayOf,
  parseAsBoolean,
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
  deprecated: parseAsBoolean.withDefault(false),
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
  const [{ name, state, gender, deprecated }] = useQueryStates(searchParams);
  const hrefSingle = serialize(`/sor/single`, {
    name,
    state,
    gender,
    deprecated,
  });
  const hrefAverage = serialize(`/sor/average`, {
    name,
    state,
    gender,
    deprecated,
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
