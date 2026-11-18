import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  SiDiscord,
  SiFacebook,
  SiGithub,
  SiInstagram,
} from "@icons-pack/react-simple-icons";
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function FooterSkeleton() {
  return (
    <footer className="mt-auto bg-chrome text-white/70">
      <div className="h-1 bg-brand" aria-hidden />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              className="inline-flex items-center gap-2 font-display text-lg font-semibold tracking-wide text-white uppercase"
              href="https://github.com/cubingmexico-org"
            >
              <SiGithub className="size-5" />
              Cubing México
            </Link>
            <Skeleton className="mt-2 h-4 w-36 bg-white/15" />
          </div>
          <div className="flex items-center gap-4">
            <SiFacebook className="h-5 w-5 text-white/40" />
            <SiInstagram className="h-5 w-5 text-white/40" />
            <SiDiscord className="h-5 w-5 text-white/40" />
            <ThemeToggle className="text-white" />
          </div>
        </div>
        <Skeleton className="mt-6 h-4 w-64 bg-white/10" />
        <Skeleton className="mt-4 h-12 w-full max-w-xl bg-white/10" />
      </div>
    </footer>
  );
}
