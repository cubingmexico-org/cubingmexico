import type { ComponentType } from "react";
import { Mail } from "lucide-react";
import {
  SiFacebook,
  SiInstagram,
  SiTiktok,
  SiWhatsapp,
  SiX,
} from "@icons-pack/react-simple-icons";

export type TeamSocialLink = {
  key: string;
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  external: boolean;
};

type SocialLinks = {
  email?: string | null;
  whatsapp?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  twitter?: string | null;
};

const SOCIAL_LINKS: {
  key: keyof SocialLinks;
  label: string;
  icon: TeamSocialLink["icon"];
  href: (value: string) => string;
}[] = [
  {
    key: "email",
    label: "Correo",
    icon: Mail,
    href: (value) => `mailto:${value}`,
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: SiWhatsapp,
    href: (value) => `https://wa.me/${value}`,
  },
  {
    key: "facebook",
    label: "Facebook",
    icon: SiFacebook,
    href: (value) => value,
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: SiInstagram,
    href: (value) => value,
  },
  { key: "tiktok", label: "TikTok", icon: SiTiktok, href: (value) => value },
  { key: "twitter", label: "Twitter", icon: SiX, href: (value) => value },
];

/** The team's social links in display order, skipping the empty ones. */
export function getTeamSocialLinks(
  socialLinks: SocialLinks | null | undefined,
): TeamSocialLink[] {
  return SOCIAL_LINKS.flatMap(({ key, label, icon, href }) => {
    const value = socialLinks?.[key];
    if (!value) return [];
    return [{ key, label, icon, href: href(value), external: key !== "email" }];
  });
}
