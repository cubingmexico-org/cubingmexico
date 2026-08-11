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
  hasWorldRecord: boolean;
  hasWorldChampionshipPodium: boolean;
  eventsWon: number;
}

interface MembersProps {
  members: Member[];
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

  const sortedMembers = [...members].sort((a, b) => {
    const tierA = getTier(a) ?? "Bronce";
    const tierB = getTier(b) ?? "Bronce";
    return tierOrder.indexOf(tierB) - tierOrder.indexOf(tierA);
  });

  return (
    <>
      {sortedMembers.map((member) => (
        <TableRow key={member.wcaId}>
          <TableCell className="whitespace-nowrap">
            <div className="flex">
              <Link
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
            <Badge className={getTierClass(getTier(member) || "Bronce")}>
              {getTier(member)}
            </Badge>
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
                member.hasWorldChampionshipPodium
                  ? "text-green-500"
                  : "text-red-500"
              }
            >
              {member.hasWorldChampionshipPodium ? "✓" : "✗"}
            </span>
          </TableCell>
          <TableCell>
            <span
              className={
                member.hasWorldRecord ? "text-green-500" : "text-red-500"
              }
            >
              {member.hasWorldRecord ? "✓" : "✗"}
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
