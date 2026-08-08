"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { getCurrentUserTeamAction } from "@/app/actions";
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

  useEffect(() => {
    const wcaId = session?.user?.wcaId;
    if (!wcaId) {
      setTeam(null);
      return;
    }

    let cancelled = false;

    void getCurrentUserTeamAction(wcaId).then((result) => {
      if (!cancelled) {
        setTeam(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [session?.user?.wcaId]);

  if (isPending) {
    return <Skeleton className="size-12 rounded-full" />;
  }

  if (!session?.user) {
    return <UserAuthForm />;
  }

  return <UserDropdown user={session.user} team={team} />;
}
