"use client";

import { Button } from "@workspace/ui/components/button";
import { DropdownMenuItem } from "@workspace/ui/components/dropdown-menu";
import { LoaderCircle, LogOut } from "lucide-react";
import { WcaMonochrome } from "@workspace/icons";
import { useTransition } from "react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import z from "zod";
import { useRouter } from "next/navigation";

export function SignIn(): React.JSX.Element {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      disabled={pending}
      onClick={() => {
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
      }}
    >
      {pending ? <LoaderCircle className="animate-spin" /> : <WcaMonochrome />}
      <span>Iniciar sesión</span>
    </Button>
  );
}

export function SignOut(): React.JSX.Element {
  const router = useRouter();
  return (
    <DropdownMenuItem
      onClick={async () => {
        await authClient.signOut({
          fetchOptions: {
            onSuccess: () => {
              router.refresh();
            },
          },
        });
      }}
    >
      <LogOut />
      <span>Cerrar sesión</span>
    </DropdownMenuItem>
  );
}
