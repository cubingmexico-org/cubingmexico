import Link from "next/link";
import { CubingMexico } from "@workspace/icons";
import { HeaderNavigationMenu } from "./header-navigation-menu";
import { HeaderAuth } from "./header-auth";
import { HeaderSearch } from "./header-search";

export function Header() {
  return (
    <header className="z-50 bg-black/60 text-white backdrop-blur-sm">
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
        <div className="flex items-center gap-3">
          <HeaderSearch />
          <HeaderAuth />
        </div>
      </div>
    </header>
  );
}
