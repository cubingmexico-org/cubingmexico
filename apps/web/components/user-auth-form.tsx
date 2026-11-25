"use client";

import * as React from "react";
import { toast } from "sonner";
import { useTransition } from "react";
import { SignInButton } from "./sign-in-button";
import { authClient } from "@/lib/auth-client";
import { reportError } from "@/lib/report-error";

export function UserAuthForm(): React.JSX.Element {
  const [pending, startTransition] = useTransition();

  function signInWithWCA(): void {
    startTransition(async () => {
      try {
        await authClient.signIn.social({
          provider: "wca",
          callbackURL: "/",
        });
      } catch (error) {
        reportError(error);
        toast.error("No se pudo iniciar sesión con la WCA", {
          description: "Inténtalo de nuevo",
        });
      }
    });
  }

  return (
    <div className="grid">
      <SignInButton pending={pending} onClick={signInWithWCA} />
    </div>
  );
}
