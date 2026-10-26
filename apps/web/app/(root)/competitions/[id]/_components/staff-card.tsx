import Link from "next/link";
import { Globe, User } from "lucide-react";
import { buttonVariants } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { cn } from "@workspace/ui/lib/utils";
import type { Delegate, Organizer } from "@/types/wca";

export function StaffCard({
  title,
  description,
  members,
}: {
  title: string;
  description: string;
  members: (Delegate | Organizer)[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {members.map((member) => (
            <div key={member.wca_id} className="flex items-center gap-4">
              <Avatar>
                <AvatarImage
                  src={member.avatar.thumb_url || "/placeholder.svg"}
                  alt={member.name}
                />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{member.name}</p>
                <p className="text-sm text-muted-foreground">{member.wca_id}</p>
              </div>
              <Link
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon" }),
                )}
                href={
                  member.country.iso2 === "MX"
                    ? `/persons/${member.wca_id}`
                    : `https://www.worldcubeassociation.org/persons/${member.wca_id}`
                }
                target={member.country.iso2 === "MX" ? undefined : "_blank"}
                rel={
                  member.country.iso2 === "MX"
                    ? undefined
                    : "noopener noreferrer"
                }
              >
                <Globe />
              </Link>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
