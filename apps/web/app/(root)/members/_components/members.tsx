"use client";

import { StateLabel } from "@/components/state-flag";
import { getTier, getTierClass } from "@/lib/utils";
import type { Tier } from "@/types";
import { Badge } from "@workspace/ui/components/badge";
import { TableRow, TableCell } from "@workspace/ui/components/table";
import Link from "next/link";
import React from "react";

interface Member {
  wcaId: string;
  name: string | null;
  gender: "m" | "f" | "o" | null;
  state: string | null;
  numberOfSpeedsolvingAverages: number;
  numberOfBLDFMCMeans: number;
  hasRecord: boolean;
  hasChampionshipPodium: boolean;
  eventsWon: number;
}

interface MembersProps {
  members: Member[];
}

function getMemberTier(member: Member): Tier {
  return (
    getTier({
      ...member,
      hasWorldRecord: member.hasRecord,
      hasWorldChampionshipPodium: member.hasChampionshipPodium,
    }) ?? "Bronce"
  );
}

export function Members({ members }: MembersProps) {
  const tierOrder: Tier[] = [
    "Bronce",
    "Plata",
    "Oro",
    "Platino",
    "Ópalo",
    "Diamante",
  ];

  const sortedMembers = members
    .map((member) => ({ member, tier: getMemberTier(member) }))
    .sort((a, b) => tierOrder.indexOf(b.tier) - tierOrder.indexOf(a.tier));

  return (
    <>
      {sortedMembers.map(({ member, tier }) => (
        <TableRow key={member.wcaId}>
          <TableCell className="whitespace-nowrap">
            <div className="flex">
              <Link
                prefetch={false}
                href={`/persons/${member.wcaId}`}
                className="font-medium text-link hover:text-link/80"
              >
                {member.name}
              </Link>
            </div>
          </TableCell>
          <TableCell className="whitespace-nowrap">
            {member.state ? (
              <StateLabel stateName={member.state} />
            ) : (
              <span className="text-muted-foreground font-light">N/A</span>
            )}
          </TableCell>
          <TableCell>
            <Badge className={getTierClass(tier)}>{tier}</Badge>
          </TableCell>
          <TableCell className="text-green-500">✓</TableCell>
          <TableCell>
            <span
              className={
                Number(member.numberOfSpeedsolvingAverages) === 12
                  ? "text-green-500"
                  : "text-red-500"
              }
            >
              {Number(member.numberOfSpeedsolvingAverages) === 12 ? "✓" : "✗"}
            </span>{" "}
            ({member.numberOfSpeedsolvingAverages}/12)
          </TableCell>
          <TableCell>
            <span
              className={
                Number(member.numberOfBLDFMCMeans) === 4
                  ? "text-green-500"
                  : "text-red-500"
              }
            >
              {Number(member.numberOfBLDFMCMeans) === 4 ? "✓" : "✗"}
            </span>{" "}
            ({member.numberOfBLDFMCMeans}/4)
          </TableCell>
          <TableCell>
            <span
              className={
                member.hasChampionshipPodium ? "text-green-500" : "text-red-500"
              }
            >
              {member.hasChampionshipPodium ? "✓" : "✗"}
            </span>
          </TableCell>
          <TableCell>
            <span
              className={member.hasRecord ? "text-green-500" : "text-red-500"}
            >
              {member.hasRecord ? "✓" : "✗"}
            </span>
          </TableCell>
          <TableCell>
            <span
              className={
                Number(member.eventsWon) === 17
                  ? "text-green-500"
                  : "text-red-500"
              }
            >
              {Number(member.eventsWon) === 17 ? "✓" : "✗"}
            </span>{" "}
            ({member.eventsWon}/17)
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
