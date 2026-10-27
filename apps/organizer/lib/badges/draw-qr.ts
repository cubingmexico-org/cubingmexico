import QRCode from "qrcode";
import type { CanvasElement } from "@/types/canvas";
import { drawTintedImage, loadImage } from "./canvas-images";
import { isBlankBadge } from "./placeholders";
import type { BadgePreviewData } from "./preview-canvas";

const QR_LOGOS: Partial<
  Record<
    NonNullable<CanvasElement["qrDataSource"]>,
    { src: string; name: string }
  >
> = {
  "wca-live": { src: "/wca.svg", name: "WCA Live" },
  "wca-integrated-results": { src: "/wca.svg", name: "WCA Live" },
  "competition-groups": {
    src: "/competition-groups.svg",
    name: "Competition Groups",
  },
};

function getQrData(
  element: CanvasElement,
  { person, competitionId }: BadgePreviewData,
): string | undefined {
  switch (element.qrDataSource) {
    case "wca-live":
      return `https://live.worldcubeassociation.org/link/competitions/${competitionId}`;
    case "wca-integrated-results":
      return `https://www.worldcubeassociation.org/competitions/${competitionId}/live`;
    case "competition-groups":
      if (isBlankBadge(person)) return undefined;
      return `https://www.competitiongroups.com/competitions/${competitionId}/persons/${person.registrantId}`;
    default:
      return element.qrData;
  }
}

/** Draws a logo tinted with the QR foreground over the code's center. */
async function drawQrLogo(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  logo: { src: string; name: string },
): Promise<void> {
  const logoImg = await loadImage(logo.src, { crossOrigin: "anonymous" });
  if (!logoImg) {
    console.error(`Failed to load ${logo.name} logo`);
    return;
  }

  const logoSize = Math.min(element.width, element.height) * 0.25;
  const logoX = element.x + (element.width - logoSize) / 2;
  const logoY = element.y + (element.height - logoSize) / 2;

  // Background behind the logo for better visibility
  ctx.fillStyle = element.qrBackground || "#ffffff";
  ctx.fillRect(logoX - 2, logoY - 2, logoSize + 4, logoSize + 4);

  drawTintedImage(
    ctx,
    logoImg,
    element.qrForeground || "#000000",
    logoX,
    logoY,
    logoSize,
  );
}

export async function drawQrCode(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  data: BadgePreviewData,
): Promise<void> {
  const qrData = getQrData(element, data);
  if (!qrData) return;

  try {
    const qrDataUrl = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel:
        element.qrDataSource === "wca-live" ||
        element.qrDataSource === "wca-integrated-results"
          ? "H"
          : element.qrErrorCorrection || "M",
      margin: 1,
      width: element.width,
      color: {
        dark: element.qrForeground || "#000000",
        light: element.qrBackground || "#ffffff",
      },
    });

    const qrImg = await loadImage(qrDataUrl);
    if (!qrImg) {
      console.error("Failed to load QR code");
      return;
    }
    ctx.drawImage(qrImg, element.x, element.y, element.width, element.height);

    const logo =
      element.qrIncludeIcon && element.qrDataSource
        ? QR_LOGOS[element.qrDataSource]
        : undefined;
    if (logo) {
      await drawQrLogo(ctx, element, logo);
    }
  } catch (error) {
    console.error("Failed to generate QR code:", error);
  }
}
