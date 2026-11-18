import Link from "next/link";
import { CubingMexicoOnDark } from "@workspace/icons";
import { HeaderNavigationMenu } from "./header-navigation-menu";
import { HeaderAuth } from "./header-auth";
import { HeaderSearch } from "./header-search";

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-chrome text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-3 sm:flex-row sm:gap-6 sm:px-6">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-white transition-opacity hover:opacity-90"
          >
            <CubingMexicoOnDark className="size-10 shrink-0 sm:size-11" />
            <span className="font-display text-lg font-semibold uppercase tracking-wide sm:text-xl">
              Cubing México
            </span>
          </Link>
          <HeaderNavigationMenu />
        </div>
        <div className="flex items-center gap-2">
          <HeaderSearch />
          <HeaderAuth />
        </div>
      </div>
      <div className="h-1 bg-brand" aria-hidden />
    </header>
  );
}
