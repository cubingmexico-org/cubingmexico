"use client";

import { RouteError, type RouteErrorProps } from "@/components/route-error";

export default function Error(props: RouteErrorProps) {
  return <RouteError {...props} />;
}
