import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { TeamShell } from "./team-shell";
import { getTeamShellData } from "../_lib/queries";
import { canManageTeam, getTeamRole } from "@/lib/team-auth";

export async function TeamFrame({
  params,
  children,
}: {
  params: Promise<{ stateId: string }>;
  children: ReactNode;
}) {
  const stateId = (await params).stateId;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const shellData = await getTeamShellData(stateId);

  if (!shellData) {
    return notFound();
  }

  const role = await getTeamRole(stateId, session?.user?.wcaId || "");

  return (
    <TeamShell stateId={stateId} canManage={canManageTeam(role)} {...shellData}>
      {children}
    </TeamShell>
  );
}
