"use client";

import { ChevronDownIcon, Download, Loader2 } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { useState } from "react";
import { useCanvasStore } from "@/lib/canvas-store";
import { toast } from "sonner";
import type { ExtendedPerson } from "@/types/wcif";
import JSZip from "jszip";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import type { State, Team } from "@/db/queries";
import type { Competition } from "@/types/wca";

interface ExportBadgesButtonGroupProps {
  selectedPersons: ExtendedPerson[];
  competition: Competition;
  states: State[];
  teams: Team[];
}

export function ExportBadgesButtonGroup({
  selectedPersons,
  competition,
  states,
  teams,
}: ExportBadgesButtonGroupProps) {
  const [isExporting, setIsExporting] = useState(false);

  const blankPerson: ExtendedPerson = {
    name: "",
    wcaUserId: 0,
    wcaId: "",
    registrantId: 0,
    countryIso2: "",
    gender: null,
    registration: null,
    avatar: null,
    roles: [],
    assignments: [],
    personalBests: [],
    extensions: [],
    stateId: null,
  } as unknown as ExtendedPerson;

  const {
    elements,
    canvasWidth,
    canvasHeight,
    backgroundImage,
    backgroundImageBack,
    enableBackSide,
  } = useCanvasStore();

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
          } else {
            content = content.replace(/@nombre/gi, currentPerson.name);
            content = content.replace(
              /@wcaid/gi,
              currentPerson.wcaId || "Nuevo",
            );

            const rol = currentPerson.roles.includes("delegate")
              ? currentPerson.gender === "f"
                ? "Delegada"
                : "Delegado"
              : currentPerson.roles.includes("organizer")
                ? currentPerson.gender === "f"
                  ? "Organizadora"
                  : "Organizador"
                : currentPerson.roles.find((r) => r.startsWith("staff-"))
                  ? currentPerson.gender === "f"
                    ? "Voluntaria"
                    : "Voluntario"
                  : currentPerson.gender === "f"
                    ? "Competidora"
                    : "Competidor";

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
              : element.qrDataSource === "competition-groups"
                ? `https://www.competitiongroups.com/competitions/${competition.id}/persons/${currentPerson.registrantId}`
                : element.qrData;

          if (qrData) {
            try {
              // Generate QR code as data URL
              const qrDataUrl = await QRCode.toDataURL(qrData, {
                errorCorrectionLevel:
                  element.qrDataSource === "wca-live"
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

                  // Add WCA Live logo in the center if it's a wca-live data source and icon is enabled
                  if (
                    element.qrDataSource === "wca-live" &&
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

  const exportToPNG = async () => {
    setIsExporting(true);

    const personsToExport =
      selectedPersons.length > 0 ? selectedPersons : [blankPerson];

    // Wrap the entire export logic in toast.promise
    toast.promise(
      (async () => {
        // Single badge export
        if (personsToExport.length === 1) {
          const person = personsToExport[0]!;

          // Export front side
          const frontCanvas = await createCanvasForSide(person, "front");
          frontCanvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${person.name.replace(/\s/g, "_")}_badge_front.png`;
              a.click();
              URL.revokeObjectURL(url);
            }
          });

          // Export back side if enabled
          if (enableBackSide) {
            const backCanvas = await createCanvasForSide(person, "back");
            backCanvas.toBlob((blob) => {
              if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${person.name.replace(/\s/g, "_")}_badge_back.png`;
                a.click();
                URL.revokeObjectURL(url);
              }
            });
          }
          return;
        }

        // Multiple badges export
        const zip = new JSZip();

        const promises = personsToExport.flatMap((person) => {
          const frontPromise = (async () => {
            const canvas = await createCanvasForSide(person, "front");
            return new Promise<void>((resolve) => {
              canvas.toBlob((blob) => {
                if (blob) {
                  const filename = `${person.name.replace(/\s/g, "_")}_badge_front.png`;
                  zip.file(filename, blob);
                }
                resolve();
              });
            });
          })();

          if (enableBackSide) {
            const backPromise = (async () => {
              const canvas = await createCanvasForSide(person, "back");
              return new Promise<void>((resolve) => {
                canvas.toBlob((blob) => {
                  if (blob) {
                    const filename = `${person.name.replace(/\s/g, "_")}_badge_back.png`;
                    zip.file(filename, blob);
                  }
                  resolve();
                });
              });
            })();
            return [frontPromise, backPromise];
          }

          return [frontPromise];
        });

        // Wait for all badges to be processed
        await Promise.all(promises);

        // Generate and download the ZIP file
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${competition.name.replace(/\s/g, "_")}_badges.zip`;
        a.click();
        URL.revokeObjectURL(url);
      })().finally(() => {
        setIsExporting(false);
      }),
      {
        loading: `Generando ${personsToExport.length === 1 ? "gafete" : `${personsToExport.length} gafetes`}...`,
        success: `${personsToExport.length === 1 ? "Gafete generado" : `${personsToExport.length} gafetes generados`} exitosamente`,
        error: "Error al generar los gafetes",
      },
    );
  };

  const exportToJPG = async () => {
    setIsExporting(true);

    const personsToExport =
      selectedPersons.length > 0 ? selectedPersons : [blankPerson];

    toast.promise(
      (async () => {
        // Single badge export
        if (personsToExport.length === 1) {
          const person = personsToExport[0]!;

          // Export front side
          const frontCanvas = await createCanvasForSide(person, "front");
          const frontDataUrl = frontCanvas.toDataURL("image/jpeg", 0.95);
          const frontLink = document.createElement("a");
          frontLink.href = frontDataUrl;
          frontLink.download = `${person.name.replace(/\s/g, "_")}_badge_front.jpg`;
          frontLink.click();

          // Export back side if enabled
          if (enableBackSide) {
            const backCanvas = await createCanvasForSide(person, "back");
            const backDataUrl = backCanvas.toDataURL("image/jpeg", 0.95);
            const backLink = document.createElement("a");
            backLink.href = backDataUrl;
            backLink.download = `${person.name.replace(/\s/g, "_")}_badge_back.jpg`;
            backLink.click();
          }
          return;
        }

        // Multiple badges export
        const zip = new JSZip();

        const promises = personsToExport.flatMap((person) => {
          const frontPromise = (async () => {
            const canvas = await createCanvasForSide(person, "front");
            const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
            const base64Data = dataUrl.split(",")[1];
            if (base64Data) {
              const filename = `${person.name.replace(/\s/g, "_")}_badge_front.jpg`;
              zip.file(filename, base64Data, { base64: true });
            }
          })();

          if (enableBackSide) {
            const backPromise = (async () => {
              const canvas = await createCanvasForSide(person, "back");
              const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
              const base64Data = dataUrl.split(",")[1];
              if (base64Data) {
                const filename = `${person.name.replace(/\s/g, "_")}_badge_back.jpg`;
                zip.file(filename, base64Data, { base64: true });
              }
            })();
            return [frontPromise, backPromise];
          }

          return [frontPromise];
        });

        // Wait for all badges to be processed
        await Promise.all(promises);

        // Generate and download the ZIP file
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${competition.name.replace(/\s/g, "_")}_badges_jpg.zip`;
        a.click();
        URL.revokeObjectURL(url);
      })().finally(() => {
        setIsExporting(false);
      }),
      {
        loading: `Generando ${personsToExport.length === 1 ? "gafete" : `${personsToExport.length} gafetes`} JPG...`,
        success: `${personsToExport.length === 1 ? "Gafete JPG generado" : `${personsToExport.length} gafetes JPG generados`} exitosamente`,
        error: "Error al generar los JPG",
      },
    );
  };

  const exportToPDF = async () => {
    setIsExporting(true);

    const personsToExport =
      selectedPersons.length > 0 ? selectedPersons : [blankPerson];

    toast.promise(
      (async () => {
        // Calculate page dimensions in mm
        const pageWidthMm = pxToMm(canvasWidth);
        const pageHeightMm = pxToMm(canvasHeight);

        // Single person PDF export
        if (personsToExport.length === 1) {
          const person = personsToExport[0]!;

          // Create PDF with custom page size
          const pdf = new jsPDF({
            orientation: pageWidthMm > pageHeightMm ? "landscape" : "portrait",
            unit: "mm",
            format: [pageWidthMm, pageHeightMm],
          });

          // Generate front side canvas
          const frontCanvas = await createCanvasForSide(person, "front");
          const frontDataUrl = frontCanvas.toDataURL("image/png", 1.0);

          // Add front page
          pdf.addImage(frontDataUrl, "PNG", 0, 0, pageWidthMm, pageHeightMm);

          // Add back page if enabled
          if (enableBackSide) {
            pdf.addPage([pageWidthMm, pageHeightMm]);
            const backCanvas = await createCanvasForSide(person, "back");
            const backDataUrl = backCanvas.toDataURL("image/png", 1.0);
            pdf.addImage(backDataUrl, "PNG", 0, 0, pageWidthMm, pageHeightMm);
          }

          // Download PDF
          pdf.save(`${person.name.replace(/\s/g, "_")}_badge.pdf`);
          return;
        }

        // Multiple persons - create ZIP with individual PDFs
        const zip = new JSZip();

        const promises = personsToExport.map(async (person) => {
          // Create PDF with custom page size
          const pdf = new jsPDF({
            orientation: pageWidthMm > pageHeightMm ? "landscape" : "portrait",
            unit: "mm",
            format: [pageWidthMm, pageHeightMm],
          });

          // Generate front side canvas
          const frontCanvas = await createCanvasForSide(person, "front");
          const frontDataUrl = frontCanvas.toDataURL("image/png", 1.0);

          // Add front page
          pdf.addImage(frontDataUrl, "PNG", 0, 0, pageWidthMm, pageHeightMm);

          // Add back page if enabled
          if (enableBackSide) {
            pdf.addPage([pageWidthMm, pageHeightMm]);
            const backCanvas = await createCanvasForSide(person, "back");
            const backDataUrl = backCanvas.toDataURL("image/png", 1.0);
            pdf.addImage(backDataUrl, "PNG", 0, 0, pageWidthMm, pageHeightMm);
          }

          // Get PDF as blob and add to ZIP
          const pdfBlob = pdf.output("blob");
          const filename = `${person.name.replace(/\s/g, "_")}_badge.pdf`;
          zip.file(filename, pdfBlob);
        });

        // Wait for all PDFs to be generated
        await Promise.all(promises);

        // Generate and download the ZIP file
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${competition.name.replace(/\s/g, "_")}_badges_pdf.zip`;
        a.click();
        URL.revokeObjectURL(url);
      })().finally(() => {
        setIsExporting(false);
      }),
      {
        loading: `Generando PDF${personsToExport.length === 1 ? "" : "s"}...`,
        success: `PDF${personsToExport.length === 1 ? "" : "s"} generado${personsToExport.length === 1 ? "" : "s"} exitosamente`,
        error: "Error al generar los PDFs",
      },
    );
  };

  const exportToPDF2x2 = async () => {
    setIsExporting(true);

    const blankCount = enableBackSide ? 4 : 8;
    const personsToExport =
      selectedPersons.length > 0
        ? [...selectedPersons]
        : Array(blankCount).fill(blankPerson);

    if (selectedPersons.length > 0) {
      const remainder = personsToExport.length % blankCount;
      if (remainder !== 0) {
        const paddingNeeded = blankCount - remainder;
        for (let i = 0; i < paddingNeeded; i++) {
          personsToExport.push(blankPerson);
        }
      }
    }

    toast.promise(
      (async () => {
        const rotateCanvasForLandscapeExport = (
          canvas: HTMLCanvasElement,
        ): HTMLCanvasElement => {
          if (canvas.width <= canvas.height) {
            return canvas;
          }

          const rotatedCanvas = document.createElement("canvas");
          rotatedCanvas.width = canvas.height;
          rotatedCanvas.height = canvas.width;

          const rotatedCtx = rotatedCanvas.getContext("2d");

          if (!rotatedCtx) {
            return canvas;
          }

          rotatedCtx.translate(rotatedCanvas.width, 0);
          rotatedCtx.rotate(Math.PI / 2);
          rotatedCtx.drawImage(canvas, 0, 0);

          return rotatedCanvas;
        };

        // US Letter dimensions in mm (landscape)
        const LETTER_WIDTH_MM = 11 * 25.4; // 279.4
        const LETTER_HEIGHT_MM = 8.5 * 25.4; // 215.9

        // Leave 1 inch margin on all sides
        const MARGIN_MM = 25.4;
        const usableWidth = LETTER_WIDTH_MM - MARGIN_MM * 2;
        const usableHeight = LETTER_HEIGHT_MM - MARGIN_MM * 2;

        const drawDotted = (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pdf: any,
          x1: number,
          y1: number,
          x2: number,
          y2: number,
          segment = 1,
          gap = 1,
        ) => {
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.hypot(dx, dy);
          if (len === 0) return;
          const step = segment + gap;
          const segments = Math.ceil(len / step);
          for (let i = 0; i < segments; i++) {
            const start = (i * step) / len;
            const end = Math.min((i * step + segment) / len, 1);
            const sx = x1 + dx * start;
            const sy = y1 + dy * start;
            const ex = x1 + dx * end;
            const ey = y1 + dy * end;
            pdf.line(sx, sy, ex, ey);
          }
        };

        // If back sides should be placed next to fronts -> 4 pairs per page (2x2 pairs).
        // Otherwise place 8 fronts per page (4x2 grid).
        if (enableBackSide) {
          const pairsPerPage = 4; // 2 columns x 2 rows of pairs
          const pairSlotWidth = usableWidth / 2; // each pair occupies half usable width
          const pairSlotHeight = usableHeight / 2; // each pair occupies half usable height
          const singleSlotWidth = pairSlotWidth / 2; // front/back each take half of pair width
          const singleSlotHeight = pairSlotHeight;

          const pdf = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: [LETTER_WIDTH_MM, LETTER_HEIGHT_MM],
          });

          let firstPage = true;

          for (let i = 0; i < personsToExport.length; i += pairsPerPage) {
            const chunk = personsToExport.slice(i, i + pairsPerPage);

            if (!firstPage) {
              pdf.addPage([LETTER_WIDTH_MM, LETTER_HEIGHT_MM]);
            }
            firstPage = false;

            // For each pair in the chunk place front on left half of pair and back on right half
            await Promise.all(
              chunk.map(async (person, index) => {
                const row = Math.floor(index / 2);
                const col = index % 2;
                const baseX = MARGIN_MM + col * pairSlotWidth;
                const baseY = MARGIN_MM + row * pairSlotHeight;

                const frontCanvas = rotateCanvasForLandscapeExport(
                  await createCanvasForSide(person, "front"),
                );
                const frontDataUrl = frontCanvas.toDataURL("image/png", 1.0);

                // Place front
                pdf.addImage(
                  frontDataUrl,
                  "PNG",
                  baseX,
                  baseY,
                  singleSlotWidth,
                  singleSlotHeight,
                );

                // Place back (generate even if blank)
                const backCanvas = rotateCanvasForLandscapeExport(
                  await createCanvasForSide(person, "back"),
                );
                const backDataUrl = backCanvas.toDataURL("image/png", 1.0);

                pdf.addImage(
                  backDataUrl,
                  "PNG",
                  baseX + singleSlotWidth,
                  baseY,
                  singleSlotWidth,
                  singleSlotHeight,
                );
              }),
            );

            // draw dotted cut lines over the usable area (4 columns x 2 rows)
            pdf.setLineWidth(0.3);
            pdf.setDrawColor(120);
            // vertical lines (3 lines dividing into 4 columns)
            for (let c = 1; c < 4; c++) {
              const x = MARGIN_MM + (c * usableWidth) / 4;
              drawDotted(pdf, x, MARGIN_MM, x, MARGIN_MM + usableHeight, 1, 1);
            }
            // horizontal lines (1 line dividing into 2 rows)
            const y = MARGIN_MM + usableHeight / 2;
            drawDotted(pdf, MARGIN_MM, y, MARGIN_MM + usableWidth, y, 1, 1);
          }

          pdf.save(`${competition.name.replace(/\s/g, "_")}_badges_2x2.pdf`);
        } else {
          // No back sides: place 8 badges per page (4 columns x 2 rows) inside margins
          const cols = 4;
          const rows = 2;
          const slotsPerPage = cols * rows;
          const slotWidth = usableWidth / cols;
          const slotHeight = usableHeight / rows;

          const pdf = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: [LETTER_WIDTH_MM, LETTER_HEIGHT_MM],
          });

          let firstPage = true;

          for (let i = 0; i < personsToExport.length; i += slotsPerPage) {
            const chunk = personsToExport.slice(i, i + slotsPerPage);

            if (!firstPage) {
              pdf.addPage([LETTER_WIDTH_MM, LETTER_HEIGHT_MM]);
            }
            firstPage = false;

            await Promise.all(
              chunk.map(async (person, index) => {
                const row = Math.floor(index / cols);
                const col = index % cols;
                const x = MARGIN_MM + col * slotWidth;
                const y = MARGIN_MM + row * slotHeight;

                const frontCanvas = rotateCanvasForLandscapeExport(
                  await createCanvasForSide(person, "front"),
                );
                const frontDataUrl = frontCanvas.toDataURL("image/png", 1.0);

                pdf.addImage(frontDataUrl, "PNG", x, y, slotWidth, slotHeight);
              }),
            );

            // draw dotted cut lines over the usable area (4 columns x 2 rows)
            pdf.setLineWidth(0.3);
            pdf.setDrawColor(120);
            // vertical lines
            for (let c = 1; c < cols; c++) {
              const x = MARGIN_MM + c * slotWidth;
              drawDotted(pdf, x, MARGIN_MM, x, MARGIN_MM + usableHeight, 1, 1);
            }
            // horizontal lines
            for (let r = 1; r < rows; r++) {
              const y = MARGIN_MM + r * slotHeight;
              drawDotted(pdf, MARGIN_MM, y, MARGIN_MM + usableWidth, y, 1, 1);
            }
          }

          pdf.save(`${competition.name.replace(/\s/g, "_")}_badges_2x2.pdf`);
        }
      })().finally(() => {
        setIsExporting(false);
      }),
      {
        loading: `Generando PDF 2x2...`,
        success: `PDF 2x2 generado exitosamente`,
        error: "Error al generar el PDF 2x2",
      },
    );
  };

  return (
    <ButtonGroup>
      <Button variant="outline" disabled={isExporting} onClick={exportToPNG}>
        {isExporting ? (
          <>
            <Loader2 className="animate-spin" />
            Exportando...
          </>
        ) : (
          <>
            <Download />
            Exportar PNG
          </>
        )}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="pl-2!">
            <ChevronDownIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="[--radius:1rem]">
          <DropdownMenuGroup>
            <DropdownMenuItem disabled={isExporting} onClick={exportToJPG}>
              <Download />
              Exportar JPG
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isExporting} onClick={exportToPDF}>
              <Download />
              Exportar PDF
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isExporting} onClick={exportToPDF2x2}>
              <Download />
              Exportar PDF (2x2)
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  );
}
