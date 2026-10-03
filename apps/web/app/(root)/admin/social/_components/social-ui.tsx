"use client";

import { Eye } from "lucide-react";
import { SiFacebook, SiInstagram } from "@icons-pack/react-simple-icons";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import type { PreviewTarget, SocialPostType } from "./social-types";

export function platformLabel(platform: string) {
  if (platform === "facebook") return "Facebook";
  if (platform === "instagram") return "Instagram";
  return platform;
}

export function PlatformIcon({
  platform,
  className = "size-3.5",
}: {
  platform: string;
  className?: string;
}) {
  if (platform === "facebook") return <SiFacebook className={className} />;
  if (platform === "instagram") return <SiInstagram className={className} />;
  return null;
}

export function postTypeLabel(postType: string) {
  if (postType === "resultados") return "RESULTADOS";
  if (postType === "record") return "RÉCORD";
  if (postType === "upcoming") return "PRÓXIMA";
  if (postType === "summary_unlock") return "RESUMEN";
  if (postType === "weekly_digest") return "SEMANA";
  if (postType === "streaks_monthly") return "RACHAS";
  if (postType === "mollerz") return "MOLLERZ";
  if (postType === "nemesis") return "NÉMESIS";
  if (postType === "year_recap") return "AÑO";
  return postType;
}

export function missingPlatformBadges(row: {
  facebookPosted: boolean;
  instagramPosted: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {!row.facebookPosted ? (
        <Badge variant="outline" className="gap-1">
          <SiFacebook className="size-3" />
          Facebook
        </Badge>
      ) : null}
      {!row.instagramPosted ? (
        <Badge variant="outline" className="gap-1">
          <SiInstagram className="size-3" />
          Instagram
        </Badge>
      ) : null}
    </div>
  );
}

export function PreviewButton({
  postType,
  subjectKey,
  name,
  disabled,
  onPreview,
}: {
  postType: SocialPostType;
  subjectKey: string;
  name: string;
  disabled: boolean;
  onPreview: (target: PreviewTarget) => void;
}) {
  return (
    <Button
      size="icon"
      variant="ghost"
      className="size-8"
      disabled={disabled}
      aria-label={`Vista previa de ${name}`}
      onClick={() => onPreview({ postType, subjectKey, name })}
    >
      <Eye className="size-4" />
    </Button>
  );
}
