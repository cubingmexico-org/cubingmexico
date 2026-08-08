import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/private/", "/persons/", "/competitions/"],
      },
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "Anthropic-ai",
          "Claude-Web",
          "Bytespider",
          "CCBot",
        ],
        disallow: "/",
      },
    ],
    sitemap: "https://www.cubingmexico.net/sitemap.xml",
  };
}
