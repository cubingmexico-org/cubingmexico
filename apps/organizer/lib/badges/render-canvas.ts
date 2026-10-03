import type { useCanvasStore } from "@/lib/canvas-store";
import { getPrimaryRoleLabel } from "@/lib/person-roles";
import type { ExtendedPerson, WCIF } from "@/types/wcif";
import QRCode from "qrcode";
import type { State, Team } from "@/db/queries";
import type { Competition } from "@/types/wca";
import { getBadgeGroupStationFields } from "@/lib/groups/badge-fields";

type CanvasStoreState = ReturnType<typeof useCanvasStore.getState>;

export function createBadgeRenderer({
  competition,
  states,
  teams,
  wcif,
  competitionLogoUrl,
  elements,
  canvasWidth,
  canvasHeight,
  backgroundImage,
  backgroundImageBack,
}: {
  competition: Competition;
  states: State[];
  teams: Team[];
  wcif: WCIF;
  competitionLogoUrl?: string | null;
  elements: CanvasStoreState["elements"];
  canvasWidth: number;
  canvasHeight: number;
  backgroundImage: CanvasStoreState["backgroundImage"];
  backgroundImageBack: CanvasStoreState["backgroundImageBack"];
}) {
  const DPI = 300;
  const pxToMm = (px: number) => (px * 25.4) / DPI;

  // Helper function to measure text and calculate optimal font size with multi-line support
  const measureTextAndAdjustFontSize = (
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    maxHeight: number,
    baseFontSize: number,
    fontFamily: string,
    fontWeight: string,
  ): { fontSize: number; lines: string[] } => {
    let fontSize = baseFontSize;
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

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
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
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
  };

  // Shared function to draw all elements on a canvas
  const drawElements = async (
    ctx: CanvasRenderingContext2D,
    currentPerson: ExtendedPerson,
    side: "front" | "back" = "front",
  ) => {
    for (const element of elements[side]) {
      ctx.save();

      const centerX = element.x + element.width / 2;
      const centerY = element.y + element.height / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate((element.rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);
      ctx.globalAlpha = element.opacity !== undefined ? element.opacity : 1;

      switch (element.type) {
        case "rectangle":
          ctx.fillStyle = element.backgroundColor || "#3b82f6";
          ctx.fillRect(element.x, element.y, element.width, element.height);
          break;
        case "circle":
          ctx.fillStyle = element.backgroundColor || "#8b5cf6";
          ctx.beginPath();
          ctx.arc(
            element.x + element.width / 2,
            element.y + element.height / 2,
            element.width / 2,
            0,
            2 * Math.PI,
          );
          ctx.fill();
          break;
        case "text": {
          const baseFontSize = element.fontSize || 24;
          const fontFamily = element.fontFamily || "sans-serif";
          const fontWeight = element.fontWeight || "normal";

          // Replace placeholder text with person's data
          let content = element.content || "";
          if (!currentPerson.name) {
            content = content.replace(/@nombre/gi, "");
            content = content.replace(/@wcaid/gi, "");
            content = content.replace(/@rol/gi, "");
            content = content.replace(/@id/gi, "");
            content = content.replace(/@país/gi, "");
            content = content.replace(/@estado/gi, "");
            content = content.replace(/@team/gi, "");
            content = content.replace(/@grupo/gi, "");
            content = content.replace(/@estación/gi, "");
          } else {
            content = content.replace(/@nombre/gi, currentPerson.name);
            content = content.replace(
              /@wcaid/gi,
              currentPerson.wcaId || "Nuevo",
            );

            const rol = getPrimaryRoleLabel(currentPerson);

            content = content.replace(/@rol/gi, rol);

            content = content.replace(
              /@id/gi,
              String(currentPerson.registrantId) || "Desconocido",
            );

            const regionNames = new Intl.DisplayNames(["es"], {
              type: "region",
            });
            const countryName =
              regionNames.of(currentPerson.countryIso2) || "Desconocido";

            content = content.replace(/@país/gi, countryName);

            content = content.replace(/@país/gi, countryName);

            const stateName = states.find(
              (s) => s.id === currentPerson.stateId,
            )?.name;

            content = content.replace(/@estado/gi, stateName || "Desconocido");

            const teamName = teams.find(
              (t) => t.stateId === currentPerson.stateId,
            )?.name;

            content = content.replace(/@team/gi, teamName || "Desconocido");

            const { grupo, estacion } = getBadgeGroupStationFields(
              currentPerson,
              wcif,
            );
            content = content.replace(/@grupo/gi, grupo || "—");
            content = content.replace(/@estación/gi, estacion || "—");
          }

          // Calculate optimal font size and split into lines
          const { fontSize: optimalFontSize, lines } =
            measureTextAndAdjustFontSize(
              ctx,
              content,
              element.width,
              element.height,
              baseFontSize,
              fontFamily,
              fontWeight,
            );

          // Apply drop shadow if enabled
          if (element.dropShadow?.enabled) {
            ctx.shadowColor = element.dropShadow.color || "#000000";
            ctx.shadowBlur = element.dropShadow.blur || 4;
            ctx.shadowOffsetX = element.dropShadow.offsetX || 2;
            ctx.shadowOffsetY = element.dropShadow.offsetY || 2;
          }

          ctx.fillStyle = element.color || "#000000";
          ctx.font = `${fontWeight} ${optimalFontSize}px ${fontFamily}`;
          ctx.textAlign = element.textAlign || "left";

          const lineHeight = optimalFontSize * 1.2;
          const totalTextHeight = lines.length * lineHeight;
          const startY =
            element.y +
            (element.height - totalTextHeight) / 2 +
            optimalFontSize;

          // Draw each line
          lines.forEach((line, index) => {
            let textX = element.x;
            if (element.textAlign === "center") {
              textX = element.x + element.width / 2;
            } else if (element.textAlign === "right") {
              textX = element.x + element.width;
            }

            ctx.fillText(line, textX, startY + index * lineHeight);
          });

          // Reset shadow after drawing text
          if (element.dropShadow?.enabled) {
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
          }

          ctx.textAlign = "left";
          break;
        }
        case "image":
          if (element.imageUrl) {
            const img = new Image();

            const isWcaAvatar = element.imageUrl === "/avatar.png";
            const isTeamLogo = element.imageUrl === "/team-logo.svg";
            const isCompetitionLogo =
              element.imageUrl === "/competition-logo.svg";
            const isCountryFlag = element.imageUrl === "/country.svg";
            const isEventsIcon = element.imageUrl === "/events.svg";

            if (
              !currentPerson.name &&
              (isWcaAvatar || isTeamLogo || isCountryFlag)
            ) {
              break;
            }

            const teamImage = teams.find(
              (t) => t.stateId === currentPerson.stateId,
            )?.image;

            if (isEventsIcon) {
              const eventsOrdered = competition.event_ids;

              // Get person's event IDs
              const personEventIds = !currentPerson.name
                ? [...competition.event_ids]
                : [...(currentPerson.registration?.eventIds || [])];

              if (personEventIds.length > 0) {
                // Sort person's events according to eventsOrdered
                const sortedEventIds = personEventIds.sort((a, b) => {
                  const indexA = eventsOrdered.indexOf(a);
                  const indexB = eventsOrdered.indexOf(b);
                  return indexA - indexB;
                });

                const spacing = 5;
                const iconSize = element.height;
                const totalWidth =
                  iconSize * sortedEventIds.length +
                  spacing * (sortedEventIds.length - 1);

                // Calculate starting X position to center the icons
                const startX = element.x + (element.width - totalWidth) / 2;

                // Load and draw each event icon
                const eventPromises = sortedEventIds.map((eventId, index) => {
                  return new Promise((resolveEvent) => {
                    const eventImg = new Image();
                    eventImg.crossOrigin = "anonymous";

                    eventImg.onload = () => {
                      const xPos = startX + (iconSize + spacing) * index;

                      const tempCanvas = document.createElement("canvas");
                      tempCanvas.width = iconSize;
                      tempCanvas.height = iconSize;
                      const tempCtx = tempCanvas.getContext("2d");

                      tempCtx?.drawImage(eventImg, 0, 0, iconSize, iconSize);

                      tempCtx!.globalCompositeOperation = "source-in";
                      tempCtx!.fillStyle = element.color || "#000000";
                      tempCtx!.fillRect(0, 0, iconSize, iconSize);

                      ctx.drawImage(
                        tempCanvas,
                        xPos,
                        element.y,
                        iconSize,
                        iconSize,
                      );

                      resolveEvent(void 0);
                    };

                    eventImg.onerror = () => {
                      console.error(`Failed to load event icon: ${eventId}`);
                      resolveEvent(void 0);
                    };

                    eventImg.src = `/events/${eventId}.svg`;
                  });
                });

                await Promise.all(eventPromises);
              }
              break;
            }

            const imageUrl =
              isWcaAvatar && currentPerson.avatar
                ? `/api/image-proxy?url=${encodeURIComponent(currentPerson.avatar.url)}`
                : isTeamLogo
                  ? teamImage || "/logo.svg"
                  : isCompetitionLogo
                    ? competitionLogoUrl
                      ? `/api/image-proxy?url=${encodeURIComponent(competitionLogoUrl)}`
                      : "/logo.svg"
                    : isCountryFlag
                      ? `https://flagcdn.com/h240/${currentPerson.countryIso2.toLowerCase()}.png`
                      : element.imageUrl;

            if (imageUrl.startsWith("http")) {
              img.crossOrigin = "anonymous";
            }

            await new Promise<void>((resolve) => {
              img.onload = () => {
                // Apply border radius if specified
                if (element.borderRadius && element.borderRadius > 0) {
                  ctx.save();
                  ctx.beginPath();

                  // For 50% border radius, draw a circle
                  if (element.borderRadius === 50) {
                    const centerX = element.x + element.width / 2;
                    const centerY = element.y + element.height / 2;
                    const radius = Math.min(element.width, element.height) / 2;
                    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                  } else {
                    // For other values, draw rounded rectangle
                    // Cap the radius to prevent overlapping corners
                    const maxRadius =
                      Math.min(element.width, element.height) / 2;
                    const radius = Math.min(
                      (element.borderRadius / 100) * maxRadius * 2,
                      maxRadius,
                    );

                    ctx.moveTo(element.x + radius, element.y);
                    ctx.lineTo(element.x + element.width - radius, element.y);
                    ctx.quadraticCurveTo(
                      element.x + element.width,
                      element.y,
                      element.x + element.width,
                      element.y + radius,
                    );
                    ctx.lineTo(
                      element.x + element.width,
                      element.y + element.height - radius,
                    );
                    ctx.quadraticCurveTo(
                      element.x + element.width,
                      element.y + element.height,
                      element.x + element.width - radius,
                      element.y + element.height,
                    );
                    ctx.lineTo(element.x + radius, element.y + element.height);
                    ctx.quadraticCurveTo(
                      element.x,
                      element.y + element.height,
                      element.x,
                      element.y + element.height - radius,
                    );
                    ctx.lineTo(element.x, element.y + radius);
                    ctx.quadraticCurveTo(
                      element.x,
                      element.y,
                      element.x + radius,
                      element.y,
                    );
                  }

                  ctx.closePath();
                  ctx.clip();
                }

                if (element.keepAspectRatio) {
                  // Calculate dimensions for 1:1 crop
                  const size = Math.min(img.width, img.height);
                  const sx = (img.width - size) / 2;
                  const sy = (img.height - size) / 2;

                  // Draw cropped image to 1:1 aspect ratio
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
                  // Draw image normally, stretching to fit
                  ctx.drawImage(
                    img,
                    element.x,
                    element.y,
                    element.width,
                    element.height,
                  );
                }

                if (element.borderRadius && element.borderRadius > 0) {
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
          break;
        case "qrcode": {
          if (
            !currentPerson.name &&
            element.qrDataSource === "competition-groups"
          ) {
            break;
          }
          // Replace placeholder text with person's data
          const qrData =
            element.qrDataSource === "wca-live"
              ? `https://live.worldcubeassociation.org/link/competitions/${competition.id}`
              : element.qrDataSource === "wca-integrated-results"
                ? `https://www.worldcubeassociation.org/competitions/${competition.id}/live`
                : element.qrDataSource === "competition-groups"
                  ? `https://www.competitiongroups.com/competitions/${competition.id}/persons/${currentPerson.registrantId}`
                  : element.qrData;

          if (qrData) {
            try {
              // Generate QR code as data URL
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

              // Draw QR code
              const qrImg = new Image();
              await new Promise<void>((resolve) => {
                qrImg.onload = () => {
                  ctx.drawImage(
                    qrImg,
                    element.x,
                    element.y,
                    element.width,
                    element.height,
                  );

                  // Add WCA logo in the center for WCA QR data sources
                  if (
                    (element.qrDataSource === "wca-live" ||
                      element.qrDataSource === "wca-integrated-results") &&
                    element.qrIncludeIcon
                  ) {
                    const logoImg = new Image();
                    logoImg.crossOrigin = "anonymous";
                    logoImg.onload = () => {
                      // Calculate logo size (approximately 20-25% of QR code size)
                      const logoSize =
                        Math.min(element.width, element.height) * 0.25;
                      const logoX = element.x + (element.width - logoSize) / 2;
                      const logoY = element.y + (element.height - logoSize) / 2;

                      // Draw a background behind the logo for better visibility
                      ctx.fillStyle = element.qrBackground || "#ffffff";
                      ctx.fillRect(
                        logoX - 2,
                        logoY - 2,
                        logoSize + 4,
                        logoSize + 4,
                      );

                      // Create a temporary canvas to colorize the logo
                      const tempCanvas = document.createElement("canvas");
                      tempCanvas.width = logoSize;
                      tempCanvas.height = logoSize;
                      const tempCtx = tempCanvas.getContext("2d");

                      if (tempCtx) {
                        tempCtx.drawImage(logoImg, 0, 0, logoSize, logoSize);
                        tempCtx.globalCompositeOperation = "source-in";
                        tempCtx.fillStyle = element.qrForeground || "#000000";
                        tempCtx.fillRect(0, 0, logoSize, logoSize);

                        // Draw the colorized logo
                        ctx.drawImage(
                          tempCanvas,
                          logoX,
                          logoY,
                          logoSize,
                          logoSize,
                        );
                      }

                      resolve();
                    };
                    logoImg.onerror = () => {
                      console.error("Failed to load WCA Live logo");
                      resolve();
                    };
                    logoImg.src = "/wca.svg";
                  } else if (
                    element.qrDataSource === "competition-groups" &&
                    element.qrIncludeIcon
                  ) {
                    const logoImg = new Image();
                    logoImg.crossOrigin = "anonymous";
                    logoImg.onload = () => {
                      // Calculate logo size (approximately 20-25% of QR code size)
                      const logoSize =
                        Math.min(element.width, element.height) * 0.25;
                      const logoX = element.x + (element.width - logoSize) / 2;
                      const logoY = element.y + (element.height - logoSize) / 2;

                      // Draw a background behind the logo for better visibility
                      ctx.fillStyle = element.qrBackground || "#ffffff";
                      ctx.fillRect(
                        logoX - 2,
                        logoY - 2,
                        logoSize + 4,
                        logoSize + 4,
                      );

                      // Create a temporary canvas to colorize the logo
                      const tempCanvas = document.createElement("canvas");
                      tempCanvas.width = logoSize;
                      tempCanvas.height = logoSize;
                      const tempCtx = tempCanvas.getContext("2d");

                      if (tempCtx) {
                        tempCtx.drawImage(logoImg, 0, 0, logoSize, logoSize);
                        tempCtx.globalCompositeOperation = "source-in";
                        tempCtx.fillStyle = element.qrForeground || "#000000";
                        tempCtx.fillRect(0, 0, logoSize, logoSize);

                        // Draw the colorized logo
                        ctx.drawImage(
                          tempCanvas,
                          logoX,
                          logoY,
                          logoSize,
                          logoSize,
                        );
                      }

                      resolve();
                    };
                    logoImg.onerror = () => {
                      console.error("Failed to load Competition Groups logo");
                      resolve();
                    };
                    logoImg.src = "/competition-groups.svg";
                  } else {
                    resolve();
                  }
                };
                qrImg.onerror = () => {
                  console.error("Failed to load QR code");
                  resolve();
                };
                qrImg.src = qrDataUrl;
              });
            } catch (error) {
              console.error("Failed to generate QR code:", error);
            }
          }
          break;
        }
      }

      ctx.restore();
    }
  };

  // Shared function to create and process canvas
  const createCanvasForSide = (
    person: ExtendedPerson,
    side: "front" | "back",
  ): Promise<HTMLCanvasElement> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(canvas);
        return;
      }

      const processCanvas = async () => {
        await drawElements(ctx, person, side);
        resolve(canvas);
      };

      if (backgroundImage && side === "front") {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = backgroundImage;
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          void processCanvas();
        };
        img.onerror = () => {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          void processCanvas();
        };
      } else if (backgroundImageBack && side === "back") {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = backgroundImageBack;
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          void processCanvas();
        };
        img.onerror = () => {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          void processCanvas();
        };
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        void processCanvas();
      }
    });
  };

  return { pxToMm, createCanvasForSide };
}

export type BadgeRenderer = ReturnType<typeof createBadgeRenderer>;
