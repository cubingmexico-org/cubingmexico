import QRCode from "qrcode";
import type { CanvasElement } from "@/types/canvas";
import type { ExtendedPerson, WCIF } from "@/types/wcif";
import type { State, Team } from "@/db/queries";
import { getPrimaryRoleLabel } from "@/lib/person-roles";
import { getBadgeGroupStationFields } from "@/lib/groups/badge-fields";
import { canvasFont, ensureFontLoaded } from "@/lib/load-fonts";
import {
  applyDropShadow,
  applyElementTransform,
  clearDropShadow,
  drawCircle,
  drawRectangle,
  roundedRectClip,
  textAnchorX,
} from "@/lib/canvas-draw";

export interface BadgePreviewData {
  person: ExtendedPerson;
  states: State[];
  teams: Team[];
  wcif?: WCIF;
  competitionId: string;
  competitionLogoUrl?: string | null;
}

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

export async function createCanvasForSide({
  elements,
  backgroundImage,
  canvasWidth,
  canvasHeight,
  ...data
}: BadgePreviewData & {
  elements: CanvasElement[];
  backgroundImage?: string;
  canvasWidth: number;
  canvasHeight: number;
}): Promise<HTMLCanvasElement | null> {
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  if (backgroundImage) {
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = backgroundImage;
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve();
      };
      img.onerror = () => {
        console.error("Failed to load background image");
        resolve();
      };
    });
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  await drawElements(ctx, elements, data);

  return canvas;
}

export function measureTextAndAdjustFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  baseFontSize: number,
  fontFamily: string,
  fontWeight: string,
): { fontSize: number; lines: string[] } {
  let fontSize = baseFontSize;
  ctx.font = canvasFont(fontWeight, fontSize, fontFamily);

  const splitIntoLines = (text: string, maxWidth: number): string[] => {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = words[0] || "";

    for (let i = 1; i < words.length; i++) {
      const word = words[i]!;
      const testLine = currentLine + " " + word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  // Try to fit text in 2 lines maximum
  let lines = splitIntoLines(text, maxWidth);
  const lineHeight = fontSize * 1.2;
  let totalHeight = lines.length * lineHeight;

  // Reduce font size until text fits within bounds (max 2 lines)
  while ((totalHeight > maxHeight || lines.length > 2) && fontSize > 8) {
    fontSize -= 0.5;
    ctx.font = canvasFont(fontWeight, fontSize, fontFamily);
    lines = splitIntoLines(text, maxWidth);
    totalHeight = lines.length * fontSize * 1.2;
  }

  // If still more than 2 lines, force into 2 lines
  if (lines.length > 2) {
    const words = text.split(" ");
    const midPoint = Math.ceil(words.length / 2);
    lines = [
      words.slice(0, midPoint).join(" "),
      words.slice(midPoint).join(" "),
    ];
  }

  return { fontSize, lines };
}

export async function drawElements(
  ctx: CanvasRenderingContext2D,
  elements: CanvasElement[],
  data: BadgePreviewData,
) {
  for (const element of elements) {
    ctx.save();
    applyElementTransform(ctx, element);

    switch (element.type) {
      case "rectangle":
        drawRectangle(ctx, element);
        break;
      case "circle":
        drawCircle(ctx, element);
        break;
      case "text":
        await drawText(ctx, element, data);
        break;
      case "image":
        await drawImage(ctx, element, data);
        break;
      case "qrcode":
        await drawQrCode(ctx, element, data);
        break;
    }

    ctx.restore();
  }
}

function replacePlaceholders(
  content: string,
  { person, states, teams, wcif }: BadgePreviewData,
): string {
  content = content.replace(/@nombre/gi, person.name);
  content = content.replace(/@wcaid/gi, person.wcaId || "Nuevo");

  const rol = getPrimaryRoleLabel(person);

  content = content.replace(/@rol/gi, rol);

  content = content.replace(
    /@id/gi,
    String(person.registrantId) || "Desconocido",
  );

  const regionNames = new Intl.DisplayNames(["es"], { type: "region" });
  const countryName = regionNames.of(person.countryIso2) || "Desconocido";

  content = content.replace(/@país/gi, countryName);

  const stateName = states.find((s) => s.id === person.stateId)?.name;

  content = content.replace(/@estado/gi, stateName || "Desconocido");

  const teamName = teams.find((t) => t.stateId === person.stateId)?.name;

  content = content.replace(/@team/gi, teamName || "Desconocido");

  const { grupo, estacion } = getBadgeGroupStationFields(person, wcif);
  content = content.replace(/@grupo/gi, grupo || "—");
  content = content.replace(/@estación/gi, estacion || "—");

  return content;
}

async function drawText(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  data: BadgePreviewData,
) {
  const baseFontSize = element.fontSize || 24;
  const fontFamily = element.fontFamily || "sans-serif";
  const fontWeight = element.fontWeight || "normal";
  await ensureFontLoaded(fontFamily, fontWeight);

  const content = replacePlaceholders(element.content || "", data);

  const { fontSize: optimalFontSize, lines } = measureTextAndAdjustFontSize(
    ctx,
    content,
    element.width,
    element.height,
    baseFontSize,
    fontFamily,
    fontWeight,
  );

  applyDropShadow(ctx, element);

  ctx.fillStyle = element.color || "#000000";
  ctx.font = canvasFont(fontWeight, optimalFontSize, fontFamily);
  ctx.textAlign = element.textAlign || "left";

  const lineHeight = optimalFontSize * 1.2;
  const totalTextHeight = lines.length * lineHeight;
  const startY =
    element.y + (element.height - totalTextHeight) / 2 + optimalFontSize;

  const textX = textAnchorX(element);
  lines.forEach((line, index) => {
    ctx.fillText(line, textX, startY + index * lineHeight);
  });

  clearDropShadow(ctx, element);

  ctx.textAlign = "left";
}

/** Draws the image tinted with a solid color, keeping its alpha. */
function drawTintedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  color: string,
  x: number,
  y: number,
  size: number,
) {
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = size;
  tempCanvas.height = size;
  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) return;

  tempCtx.drawImage(img, 0, 0, size, size);
  tempCtx.globalCompositeOperation = "source-in";
  tempCtx.fillStyle = color;
  tempCtx.fillRect(0, 0, size, size);

  ctx.drawImage(tempCanvas, x, y, size, size);
}

async function drawEventIcons(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  person: ExtendedPerson,
) {
  const personEventIds = person.registration?.eventIds || [];
  if (personEventIds.length === 0) return;

  const spacing = 5;
  const iconSize = element.height;
  const totalWidth =
    iconSize * personEventIds.length + spacing * (personEventIds.length - 1);

  // Center the icons within the element
  const startX = element.x + (element.width - totalWidth) / 2;

  await Promise.all(
    personEventIds.map(
      (eventId, index) =>
        new Promise<void>((resolve) => {
          const eventImg = new Image();
          eventImg.crossOrigin = "anonymous";

          eventImg.onload = () => {
            const xPos = startX + (iconSize + spacing) * index;
            drawTintedImage(
              ctx,
              eventImg,
              element.color || "#000000",
              xPos,
              element.y,
              iconSize,
            );
            resolve();
          };

          eventImg.onerror = () => {
            console.error(`Failed to load event icon: ${eventId}`);
            resolve();
          };

          eventImg.src = `/events/${eventId}.svg`;
        }),
    ),
  );
}

function resolveImageUrl(
  imageUrl: string,
  { person, teams, competitionLogoUrl }: BadgePreviewData,
): string {
  if (imageUrl === "/avatar.png" && person.avatar) {
    return `/api/image-proxy?url=${encodeURIComponent(person.avatar.url)}`;
  }
  if (imageUrl === "/team-logo.svg") {
    const teamImage = teams.find((t) => t.stateId === person.stateId)?.image;
    return teamImage || "/logo.svg";
  }
  if (imageUrl === "/competition-logo.svg") {
    return competitionLogoUrl
      ? `/api/image-proxy?url=${encodeURIComponent(competitionLogoUrl)}`
      : "/logo.svg";
  }
  if (imageUrl === "/country.svg") {
    return `https://flagcdn.com/h240/${person.countryIso2.toLowerCase()}.png`;
  }
  return imageUrl;
}

async function drawImage(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  data: BadgePreviewData,
) {
  if (!element.imageUrl) return;

  if (element.imageUrl === "/events.svg") {
    await drawEventIcons(ctx, element, data.person);
    return;
  }

  const imageUrl = resolveImageUrl(element.imageUrl, data);
  const img = new Image();
  if (imageUrl.startsWith("http")) {
    img.crossOrigin = "anonymous";
  }

  await new Promise<void>((resolve) => {
    img.onload = () => {
      const rounded = !!element.borderRadius && element.borderRadius > 0;
      if (rounded) {
        ctx.save();
        roundedRectClip(ctx, element, element.borderRadius!);
      }

      if (element.keepAspectRatio) {
        // Crop the center of the image to a 1:1 aspect ratio
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;

        ctx.drawImage(
          img,
          sx,
          sy,
          size,
          size,
          element.x,
          element.y,
          element.width,
          element.height,
        );
      } else {
        ctx.drawImage(img, element.x, element.y, element.width, element.height);
      }

      if (rounded) {
        ctx.restore();
      }

      resolve();
    };
    img.onerror = (error) => {
      console.error("Failed to load image:", imageUrl, error);
      resolve();
    };
    img.src = imageUrl;
  });
}

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
      return `https://www.competitiongroups.com/competitions/${competitionId}/persons/${person.registrantId}`;
    default:
      return element.qrData;
  }
}

/** Draws a logo tinted with the QR foreground over the code's center. */
function drawQrLogo(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  logo: { src: string; name: string },
): Promise<void> {
  return new Promise((resolve) => {
    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";
    logoImg.onload = () => {
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

      resolve();
    };
    logoImg.onerror = () => {
      console.error(`Failed to load ${logo.name} logo`);
      resolve();
    };
    logoImg.src = logo.src;
  });
}

async function drawQrCode(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  data: BadgePreviewData,
) {
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

    const qrImg = new Image();
    const loaded = await new Promise<boolean>((resolve) => {
      qrImg.onload = () => {
        ctx.drawImage(
          qrImg,
          element.x,
          element.y,
          element.width,
          element.height,
        );
        resolve(true);
      };
      qrImg.onerror = () => {
        console.error("Failed to load QR code");
        resolve(false);
      };
      qrImg.src = qrDataUrl;
    });

    const logo =
      element.qrIncludeIcon && element.qrDataSource
        ? QR_LOGOS[element.qrDataSource]
        : undefined;
    if (loaded && logo) {
      await drawQrLogo(ctx, element, logo);
    }
  } catch (error) {
    console.error("Failed to generate QR code:", error);
  }
}
