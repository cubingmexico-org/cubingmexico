"use client";

import { Button } from "@workspace/ui/components/button";
import { DropdownMenuItem } from "@workspace/ui/components/dropdown-menu";
import { LoaderCircle, LogOut } from "lucide-react";
import { WcaMonochrome } from "@workspace/icons";
import { useTransition } from "react";
import { authClient } from "@/lib/auth-client";
import { reportError } from "@/lib/report-error";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function SignIn(): React.JSX.Element {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          try {
            await authClient.signIn.social({
              provider: "wca",
              callbackURL: "/",
            });
          } catch (error) {
            reportError(error);
            toast.error("Failed to sign in with WCA", {
              description: "Please try again",
            });
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
