import Link from "next/link";
import { CubingMexico } from "@workspace/icons";
import { HeaderNavigationMenu } from "./header-navigation-menu";
import { HeaderAuth } from "./header-auth";

export function Header() {
  return (
    <header className="bg-primary text-primary-foreground body-font top-0 z-50">
      <div className="mx-auto flex flex-col sm:flex-row items-center gap-8 justify-between p-5">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-8">
          <Link href="/">
            <CubingMexico className="size-16" />
          </Link>
          <HeaderNavigationMenu />
        </div>
        <HeaderAuth />
      </div>
    </header>
  );
}
