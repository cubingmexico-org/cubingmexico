"use client";

import { Button } from "@workspace/ui/components/button";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

export function BackButton({
  children,
  ...props
}: Omit<ComponentProps<typeof Button>, "onClick">) {
  const router = useRouter();

  return (
    <Button type="button" onClick={() => router.back()} {...props}>
      {children}
    </Button>
  );
}
