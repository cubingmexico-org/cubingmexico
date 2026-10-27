"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { getHeaderContextAction, type HeaderContext } from "@/app/actions";
import { authClient } from "@/lib/auth-client";
import { UserAuthForm } from "./user-auth-form";
import { UserDropdown } from "./user-dropdown";

const EMPTY_CONTEXT: HeaderContext = { team: null, isSuperadmin: false };

export function HeaderAuth() {
  const { data: session, isPending } = authClient.useSession();
  const [context, setContext] = useState<HeaderContext>(EMPTY_CONTEXT);

  useEffect(() => {
    if (!session?.user?.wcaId) {
      setContext(EMPTY_CONTEXT);
      return;
    }

    let cancelled = false;

    void getHeaderContextAction()
      .catch(() => null)
      .then((result) => {
        if (!cancelled) {
          setContext(result ?? EMPTY_CONTEXT);
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
      team={context.team}
      isSuperadmin={context.isSuperadmin}
    />
  );
}
