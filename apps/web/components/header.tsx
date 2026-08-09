"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CubingMexico } from "@workspace/icons";
import { cn } from "@workspace/ui/lib/utils";
import { HeaderNavigationMenu } from "./header-navigation-menu";
import { HeaderAuth } from "./header-auth";

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 text-white transition-[background-color,box-shadow,backdrop-filter] duration-300",
        scrolled
          ? "bg-black/90 shadow-md backdrop-blur-md"
          : "bg-black/60 backdrop-blur-sm",
      )}
    >
      <div className="mx-auto flex flex-col items-center justify-between gap-4 p-4 sm:flex-row sm:gap-8 sm:p-5">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
          <Link
            href="/"
            className="flex items-center gap-3 text-white transition-opacity hover:opacity-90"
          >
            <CubingMexico className="size-12 sm:size-14" />
            <span className="font-display text-xl font-semibold uppercase tracking-wide sm:text-2xl">
              Cubing México
            </span>
          </Link>
          <HeaderNavigationMenu />
        </div>
        <HeaderAuth />
      </div>
    </header>
  );
}
