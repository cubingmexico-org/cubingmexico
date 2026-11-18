import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "@workspace/ui/lib/utils";

type PageHeadingProps<T extends ElementType = "h1"> = {
  as?: T;
  className?: string;
  children: React.ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

/**
 * Display title for data pages — Oswald, no decorative chrome.
 */
export function PageHeading<T extends ElementType = "h1">({
  as,
  className,
  children,
  ...props
}: PageHeadingProps<T>) {
  const Comp = as ?? "h1";

  return (
    <Comp
      className={cn(
        "font-display text-3xl font-bold uppercase tracking-wide text-foreground md:text-4xl",
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}
