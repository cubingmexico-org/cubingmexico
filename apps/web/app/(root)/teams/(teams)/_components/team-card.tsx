import Link from "next/link";
import { Users } from "lucide-react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";

interface TeamCardProps {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  coverImage: string | null;
  state: string;
  founded: Date | null;
  isActive: boolean;
  members: number;
}

export function TeamCard({
  id,
  name,
  description,
  image,
  coverImage,
  state,
  founded,
  isActive,
  members,
}: TeamCardProps) {
  return (
    <Link href={`/teams/${id}`}>
      <Card className="overflow-hidden transition-all hover:border-primary hover:shadow-md py-0">
        <div className="h-32 w-full overflow-hidden">
          <div className="relative h-full w-full">
            <Image
              src={coverImage || "/placeholder.svg"}
              alt={`${name} workspace image`}
              fill
              className="object-cover"
            />
          </div>
        </div>
        <CardHeader className={`pb-2 ${image ? "pt-3" : ""} relative`}>
          <div className="absolute -top-8 left-3 h-12 w-12 rounded-full border-2 border-background overflow-hidden bg-background">
            <Image
              src={image || "/placeholder.svg"}
              alt={`${name} profile`}
              width={48}
              height={48}
              className="object-cover"
            />
          </div>
          <CardTitle className="pt-6">{name}</CardTitle>
          <CardDescription className={"line-clamp-2"}>
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <span className="font-bold">{state}</span>
            {founded && <span className="mx-2">•</span>}
            {founded && (
              <span>{`Fundado en ${new Date(founded).getFullYear()}`}</span>
            )}
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Users className="mr-1 h-4 w-4" />
            <span>
              {members} miembro{members > 1 && "s"}
            </span>
          </div>
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
