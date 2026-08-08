"use client";

import * as React from "react";
import * as z from "zod";
import { toast } from "sonner";
import { useTransition } from "react";
import { SignInButton } from "./sign-in-button";
import { authClient } from "@/lib/auth-client";

export function UserAuthForm(): React.JSX.Element {
  const [pending, startTransition] = useTransition();

  function signInWithWCA(): void {
    startTransition(async () => {
      try {
        await authClient.signIn.oauth2({
          providerId: "wca",
          callbackURL: "/",
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error(error);
          toast.error("Failed to sign in with WCA", {
            description: "Please try again",
          });
        }
      }
    });
  }

  return (
    <div className="grid">
      <SignInButton pending={pending} onClick={signInWithWCA} />
    </div>
  );
}
