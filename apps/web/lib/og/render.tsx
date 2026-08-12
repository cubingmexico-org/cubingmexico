import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { ImageResponse } from "next/og";
import {
  OG_BRAND,
  OG_BRAND_WARM,
  OG_CONTENT_TYPE,
  OG_SITE_URL,
  OG_SIZE,
} from "./constants";

export { OG_CONTENT_TYPE, OG_SIZE };

export type RenderOgImageOptions = {
  title: string;
  subtitle?: string;
  badge?: string;
  /** Absolute HTTPS URL or data URI for a secondary image (e.g. team logo) */
  imageSrc?: string | null;
  /** Fallback initials when imageSrc is missing */
  initials?: string;
};

function resolvePublicFile(filename: string): string {
  const candidates = [
    join(process.cwd(), "public", filename),
    join(process.cwd(), "apps/web/public", filename),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[0]!;
}

let logoDataUriPromise: Promise<string | null> | null = null;
let fontDataPromise: Promise<ArrayBuffer | null> | null = null;

async function loadLogoDataUri(): Promise<string | null> {
  if (!logoDataUriPromise) {
    logoDataUriPromise = (async () => {
      try {
        const bytes = await readFile(resolvePublicFile("logo.png"));
        return `data:image/png;base64,${bytes.toString("base64")}`;
      } catch {
        return null;
      }
    })();
  }
  return logoDataUriPromise;
}

async function loadOswaldFont(): Promise<ArrayBuffer | null> {
  if (!fontDataPromise) {
    fontDataPromise = (async () => {
      try {
        const response = await fetch(
          "https://cdn.jsdelivr.net/fontsource/fonts/oswald@5.2.5/latin-600-normal.ttf",
        );
        if (!response.ok) {
          return null;
        }
        return await response.arrayBuffer();
      } catch {
        return null;
      }
    })();
  }
  return fontDataPromise;
}

function teamInitials(value: string | undefined): string {
  if (!value) {
    return "CM";
  }
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "CM";
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export async function renderOgImage({
  title,
  subtitle,
  badge,
  imageSrc,
  initials,
}: RenderOgImageOptions): Promise<ImageResponse> {
  const [logoSrc, fontData] = await Promise.all([
    loadLogoDataUri(),
    loadOswaldFont(),
  ]);

  const displayInitials = teamInitials(initials ?? title);
  const showAvatar = Boolean(imageSrc) || initials !== undefined;
  const fonts = fontData
    ? [
        {
          name: "Oswald",
          data: fontData,
          style: "normal" as const,
          weight: 600 as const,
        },
      ]
    : undefined;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        background: "#f8fbf9",
        color: "#0f172a",
      }}
    >
      {/* Atmosphere */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          background:
            "radial-gradient(ellipse 110% 70% at 12% -10%, rgba(154, 0, 43, 0.14), transparent 55%), radial-gradient(ellipse 80% 55% at 100% 100%, rgba(173, 75, 50, 0.12), transparent 50%), linear-gradient(165deg, #fbfcfc 0%, #f3f6f4 45%, #f8f5f1 100%)",
        }}
      />

      {/* Top accent bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 8,
          display: "flex",
          background: `linear-gradient(90deg, ${OG_BRAND} 0%, ${OG_BRAND_WARM} 55%, #c4a574 100%)`,
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "56px 64px 48px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 40,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                width={64}
                height={64}
                alt=""
                style={{ borderRadius: 12 }}
              />
            ) : null}
            <div
              style={{
                display: "flex",
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: OG_BRAND,
                fontFamily: fonts ? "Oswald" : "sans-serif",
              }}
            >
              Cubing México
            </div>
          </div>
          {badge ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 18px",
                borderRadius: 999,
                background: "rgba(154, 0, 43, 0.08)",
                color: OG_BRAND,
                fontSize: 22,
                fontWeight: 600,
                fontFamily: fonts ? "Oswald" : "sans-serif",
              }}
            >
              {badge}
            </div>
          ) : null}
        </div>

        {/* Body */}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "space-between",
            gap: 48,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              maxWidth: showAvatar ? 780 : 1040,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: title.length > 42 ? 56 : 68,
                fontWeight: 600,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
                fontFamily: fonts ? "Oswald" : "sans-serif",
                color: "#0f172a",
              }}
            >
              {title}
            </div>
            {subtitle ? (
              <div
                style={{
                  display: "flex",
                  marginTop: 20,
                  fontSize: 28,
                  lineHeight: 1.35,
                  color: "#475569",
                  maxWidth: 720,
                }}
              >
                {subtitle}
              </div>
            ) : null}
          </div>

          {showAvatar ? (
            <div
              style={{
                display: "flex",
                width: 200,
                height: 200,
                borderRadius: 28,
                overflow: "hidden",
                border: "6px solid #ffffff",
                boxShadow: "0 16px 40px rgba(15, 23, 42, 0.12)",
                background: OG_BRAND,
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {imageSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageSrc}
                  width={200}
                  height={200}
                  alt=""
                  style={{
                    width: 200,
                    height: 200,
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    fontSize: 64,
                    fontWeight: 600,
                    color: "#ffffff",
                    fontFamily: fonts ? "Oswald" : "sans-serif",
                  }}
                >
                  {displayInitials}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "auto",
            paddingTop: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 24,
              color: "#64748b",
              letterSpacing: "0.02em",
            }}
          >
            {OG_SITE_URL}
          </div>
          <div
            style={{
              display: "flex",
              width: 120,
              height: 4,
              borderRadius: 999,
              background: `linear-gradient(90deg, ${OG_BRAND}, ${OG_BRAND_WARM})`,
            }}
          />
        </div>
      </div>
    </div>,
    {
      ...OG_SIZE,
      fonts,
    },
  );
}
