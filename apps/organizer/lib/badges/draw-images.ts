import type { CanvasElement } from "@/types/canvas";
import { roundedRectClip } from "@/lib/canvas-draw";
import { drawTintedImage, loadImage } from "./canvas-images";
import { isBlankBadge } from "./placeholders";
import type { BadgePreviewData } from "./preview-canvas";

const PERSON_IMAGES = new Set([
  "/avatar.png",
  "/team-logo.svg",
  "/country.svg",
]);

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

async function drawEventIcons(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  { person, competitionEventIds }: BadgePreviewData,
): Promise<void> {
  const personEventIds = isBlankBadge(person)
    ? [...(competitionEventIds ?? [])]
    : [...(person.registration?.eventIds ?? [])];
  if (personEventIds.length === 0) return;
  if (competitionEventIds) {
    personEventIds.sort(
      (a, b) => competitionEventIds.indexOf(a) - competitionEventIds.indexOf(b),
    );
  }

  const spacing = 5;
  const iconSize = element.height;
  const totalWidth =
    iconSize * personEventIds.length + spacing * (personEventIds.length - 1);

  // Center the icons within the element
  const startX = element.x + (element.width - totalWidth) / 2;

  await Promise.all(
    personEventIds.map(async (eventId, index) => {
      const eventImg = await loadImage(`/events/${eventId}.svg`, {
        crossOrigin: "anonymous",
      });
      if (!eventImg) {
        console.error(`Failed to load event icon: ${eventId}`);
        return;
      }
      drawTintedImage(
        ctx,
        eventImg,
        element.color || "#000000",
        startX + (iconSize + spacing) * index,
        element.y,
        iconSize,
      );
    }),
  );
}

export async function drawImage(
  ctx: CanvasRenderingContext2D,
  element: CanvasElement,
  data: BadgePreviewData,
): Promise<void> {
  if (!element.imageUrl) return;

  if (element.imageUrl === "/events.svg") {
    await drawEventIcons(ctx, element, data);
    return;
  }

  if (isBlankBadge(data.person) && PERSON_IMAGES.has(element.imageUrl)) {
    return;
  }

  const imageUrl = resolveImageUrl(element.imageUrl, data);
  const img = await loadImage(imageUrl, {
    crossOrigin: imageUrl.startsWith("http") ? "anonymous" : undefined,
  });
  if (!img) {
    console.error("Failed to load image:", imageUrl);
    return;
  }

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
}
