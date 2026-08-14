import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@workspace/ui/components/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { SignOut } from "./auth-components";
import { CubingMexico } from "@workspace/icons";
import { Award, Globe } from "lucide-react";
import type { User } from "better-auth";
import { WEB_APP_URL } from "@/lib/constants";

export function Header({ user }: { user: User }) {
  const initials =
    user.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "U";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-primary/95 text-primary-foreground backdrop-blur supports-backdrop-filter:bg-primary/90">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
        <Link
          className="flex items-center gap-3 transition-opacity hover:opacity-90"
          href="/"
        >
          <CubingMexico className="size-12 md:size-14" />
          <div className="flex flex-col">
            <span className="text-xl font-bold md:text-2xl">Organización</span>
            <span className="hidden text-xs font-normal opacity-90 sm:block">
              Cubing México
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger className="group rounded-full outline-none ring-2 ring-transparent transition-all hover:ring-primary-foreground/20 focus-visible:ring-primary-foreground/40">
              <Avatar className="size-11 border-2 border-primary-foreground/20 transition-all group-hover:border-primary-foreground/40 md:size-12">
                <AvatarImage
                  src={user.image ?? undefined}
                  alt={user.name ?? "User"}
                />
                <AvatarFallback className="bg-primary-foreground/10 text-sm font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/" className="cursor-pointer">
                  <Award className="mr-2 h-4 w-4" />
                  Mis Competencias
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={WEB_APP_URL} className="cursor-pointer">
                  <Globe className="mr-2 h-4 w-4" />
                  Cubing México
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <SignOut />
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}
