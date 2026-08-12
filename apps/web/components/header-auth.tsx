"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  getCurrentUserTeamAction,
  isSuperadminAction,
} from "@/app/actions";
import { authClient } from "@/lib/auth-client";
import { UserAuthForm } from "./user-auth-form";
import { UserDropdown } from "./user-dropdown";

type Team = {
  id: string;
  name: string;
} | null;

export function HeaderAuth() {
  const { data: session, isPending } = authClient.useSession();
  const [team, setTeam] = useState<Team>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  useEffect(() => {
    const wcaId = session?.user?.wcaId;
    if (!wcaId) {
      setTeam(null);
      setIsSuperadmin(false);
      return;
    }

    let cancelled = false;

    void Promise.all([
      getCurrentUserTeamAction(wcaId),
      isSuperadminAction(wcaId),
    ]).then(([teamResult, superadmin]) => {
      if (!cancelled) {
        setTeam(teamResult);
        setIsSuperadmin(superadmin);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [session?.user?.wcaId]);

  if (isPending) {
    return <Skeleton className="size-12 rounded-full bg-white/20" />;
  }

  if (!session?.user) {
    return <UserAuthForm />;
  }

  return (
    <UserDropdown
      user={session.user}
      team={team}
      isSuperadmin={isSuperadmin}
    />
  );
}
