import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import type { TeamSocialLink } from "../_lib/social-links";

const SOCIAL_LINK_CLASS =
  "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

export function TeamAboutCard({
  description,
  socialLinks,
}: {
  description: string | null;
  socialLinks: TeamSocialLink[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Acerca de</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {description ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {description}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Este team aún no tiene una descripción.
          </p>
        )}

        {socialLinks.length > 0 ? (
          <div className="flex flex-wrap gap-2 border-t pt-4">
            {socialLinks.map((social) => {
              const Icon = social.icon;

              if (social.external) {
                return (
                  <Link
                    key={social.key}
                    href={social.href}
                    className={SOCIAL_LINK_CLASS}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon className="h-4 w-4" />
                    {social.label}
                  </Link>
                );
              }

              return (
                <a
                  key={social.key}
                  href={social.href}
                  className={SOCIAL_LINK_CLASS}
                >
                  <Icon className="h-4 w-4" />
                  {social.label}
                </a>
              );
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
