"use client";

import { WcaMonochrome } from "@workspace/icons";
import { Button } from "@workspace/ui/components/button";
import { LoaderCircle } from "lucide-react";

export function SignInButton({
  pending,
  onClick,
}: {
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      disabled={pending}
      onClick={onClick}
      variant="ghost"
      className="hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white text-white dark:hover:bg-white/10 dark:focus:bg-white/10"
    >
      {pending ? <LoaderCircle className="animate-spin" /> : <WcaMonochrome />}
      <span>Iniciar sesión</span>
    </Button>
  );
}
