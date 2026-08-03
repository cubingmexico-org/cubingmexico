"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { getCurrentUserTeamAction } from "@/app/actions";
import { UserAuthForm } from "./user-auth-form";
import { UserDropdown } from "./user-dropdown";

type Team = {
  id: string;
  name: string;
} | null;

export function HeaderAuth() {
  const { data: session, status } = useSession();
  const [team, setTeam] = useState<Team>(null);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) {
      setTeam(null);
      return;
    }

    let cancelled = false;

    void getCurrentUserTeamAction(userId).then((result) => {
      if (!cancelled) {
        setTeam(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  if (status === "loading") {
    return <Skeleton className="size-12 rounded-full" />;
  }

  if (!session?.user) {
    return <UserAuthForm />;
  }

  return <UserDropdown user={session.user} team={team} />;
}
