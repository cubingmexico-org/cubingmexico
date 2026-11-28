import Link from "next/link";
import Image from "next/image";
import { MapPin, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import type { GroupKind } from "@workspace/db/schema";
import { groupHref } from "@/lib/groups";

type GroupCardProps = {
  id: string;
  kind: GroupKind;
  name: string;
  description: string | null;
  image: string | null;
  coverImage: string | null;
  subtitle: string | null;
  founded: Date | null;
  isActive: boolean;
  members: number;
};

export function GroupCard({
  id,
  kind,
  name,
  description,
  image,
  coverImage,
  subtitle,
  founded,
  isActive,
  members,
}: GroupCardProps) {
  return (
    <Link prefetch={false} href={groupHref(kind, id)}>
      <Card className="overflow-hidden py-0 transition-all hover:border-primary hover:shadow-md">
        <div className="h-32 w-full overflow-hidden">
          <div className="relative h-full w-full">
            <Image
              src={coverImage || image || "/placeholder.svg"}
              alt={`${name} cover`}
              fill
              className="object-cover"
            />
          </div>
        </div>
        <CardHeader className={`relative pb-2 ${image ? "pt-3" : ""}`}>
          <div className="absolute -top-8 left-3 h-12 w-12 overflow-hidden rounded-full border-2 border-background bg-background">
            <Image
              src={image || "/placeholder.svg"}
              alt={`${name} logo`}
              width={48}
              height={48}
              className="object-cover"
            />
          </div>
          <CardTitle className="pt-6">{name}</CardTitle>
          <CardDescription className="line-clamp-2">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {subtitle ? (
            <div className="flex items-center text-sm font-medium text-muted-foreground">
              <MapPin className="mr-1 h-4 w-4 shrink-0" />
              <span className="truncate">{subtitle}</span>
            </div>
          ) : null}
          {founded ? (
            <div className="text-sm text-muted-foreground">
              Fundado en {new Date(founded).getFullYear()}
            </div>
          ) : null}
          {kind === "sponsor" && members === 0 ? null : (
            <div className="flex items-center text-sm text-muted-foreground">
              <Users className="mr-1 h-4 w-4" />
              <span>
                {members} miembro{members === 1 ? "" : "s"}
              </span>
            </div>
          )}
        </CardContent>
        <CardFooter className="bg-muted/50 p-2">
          <div className="flex w-full items-center justify-end text-xs text-muted-foreground">
            <Badge
              variant={isActive ? "default" : "outline"}
              className="text-xs"
            >
              {isActive ? "Activo" : "Inactivo"}
            </Badge>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
