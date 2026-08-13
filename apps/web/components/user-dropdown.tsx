"use client";

import Link from "next/link";
import {
  Users,
  UserCheck,
  UserIcon,
  LogOut,
  CalendarDays,
  CalendarRange,
  Shield,
  Award,
} from "lucide-react";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { ANNUAL_SUMMARY_ENABLED, ORGANIZER_APP_URL } from "@/lib/constants";
import { getDefaultSummaryYear } from "@/app/(root)/summary/_lib/summary-year";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@workspace/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@workspace/ui/components/dropdown-menu";

type SessionUser = NonNullable<
  NonNullable<ReturnType<typeof authClient.useSession>["data"]>["user"]
>;

export function UserDropdown({
  user,
  team,
  isSuperadmin = false,
}: {
  user: SessionUser;
  team: {
    id: string;
    name: string;
  } | null;
  isSuperadmin?: boolean;
}) {
  const isMobile = useIsMobile();
  const router = useRouter();
  const summaryYear = getDefaultSummaryYear();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full">
        <Avatar className="size-12">
          <AvatarImage src={user.image ?? undefined} />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isMobile ? "center" : "end"}>
        <DropdownMenuItem>
          <UserIcon />
          <Link href="/profile" className="w-full">
            Perfil
          </Link>
        </DropdownMenuItem>
        {user.wcaId ? (
          <DropdownMenuItem>
            <UserCheck />
            <Link href={`/persons/${user.wcaId}`} className="w-full">
              Mis resultados
            </Link>
          </DropdownMenuItem>
        ) : null}
        {ANNUAL_SUMMARY_ENABLED && user.wcaId ? (
          <DropdownMenuItem>
            <CalendarDays />
            <Link
              href={`/summary/${summaryYear}/${user.wcaId}`}
              className="w-full"
            >
              Resumen anual
            </Link>
          </DropdownMenuItem>
        ) : null}
        {team && (
          <DropdownMenuItem>
            <Users />
            <Link href={`/teams/${team.id}`} className="w-full">
              Mi Team
            </Link>
          </DropdownMenuItem>
        )}
        {ANNUAL_SUMMARY_ENABLED && team ? (
          <DropdownMenuItem>
            <CalendarRange />
            <Link
              href={`/summary/team/${summaryYear}/${team.id}`}
              className="w-full"
            >
              Resumen del Team
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem>
          <Award />
          <a href={ORGANIZER_APP_URL} className="w-full">
            Organización
          </a>
        </DropdownMenuItem>
        {isSuperadmin ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Shield />
              <Link href="/admin" className="w-full">
                Superadmin
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
        <DropdownMenuItem
          onClick={async () => {
            await authClient.signOut({
              fetchOptions: {
                onSuccess: () => {
                  router.refresh();
                },
              },
            });
          }}
        >
          <LogOut />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
