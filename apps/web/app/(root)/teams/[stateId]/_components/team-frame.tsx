import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { TeamShell } from "./team-shell";
import { getTeamShellData } from "../_lib/queries";
import { canManageTeam, getTeamRole } from "@/lib/team-auth";
import { isSuperadmin } from "@/lib/superadmin";

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

  const wcaId = session?.user?.wcaId || "";
  const role = await getTeamRole(stateId, wcaId);

  return (
    <TeamShell
      stateId={stateId}
      canManage={canManageTeam(role)}
      isSuperadmin={isSuperadmin(wcaId)}
      {...shellData}
    >
      {children}
    </TeamShell>
  );
}
