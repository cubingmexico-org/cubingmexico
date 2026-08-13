"use client";

import { CanvasEditor } from "@/components/canvas/canvas-editor";
import { Toolbar } from "@/components/canvas/toolbar";
import { PropertiesPanel } from "@/components/canvas/properties-panel";
import { CanvasSettings } from "@/components/canvas/canvas-settings";
import { Button } from "@workspace/ui/components/button";
import { Download, Eye, FlipHorizontal, RotateCcw, Upload } from "lucide-react";
import { useCanvasStore } from "@/lib/canvas-store";
import type { CanvasElement } from "@/types/canvas";
import QRCode from "qrcode";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import { useState } from "react";
import type { EventId, ExtendedPerson } from "@/types/wcif";
import { State, Team } from "@/db/queries";
import { authClient } from "@/lib/auth-client";

interface CanvasProps {
  states: State[];
  teams: Team[];
  eventIds: EventId[];
}

export function Canvas({
  states,
  teams,
  eventIds,
}: CanvasProps): React.JSX.Element {
  const {
    elements,
    canvasWidth,
    canvasHeight,
    backgroundImage,
    backgroundImageBack,
    activeSide,
    setActiveSide,
    enableBackSide,
    setElements,
    setCanvasSize,
    setBackgroundImage,
    setBackgroundImageBack,
    setEnableBackSide,
  } = useCanvasStore();

  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const session = authClient.useSession();

  const params = useParams();

  const competitionId = params.competitionId;

  const currentYear = new Date().getFullYear();

  const currentPerson = {
    name: session.data?.user?.name || "Leonardo Del Toro",
    wcaId: `${currentYear}ABCD01`,
    avatar: {
      url: session.data?.user?.image || "/avatar.png",
      thumbUrl: session.data?.user?.image || "/avatar.png",
    },
    registration: { eventIds },
    roles: [] as string[],
    registrantId: 1,
    countryIso2: "MX",
    stateId: "NAY",
  } as ExtendedPerson;

  const previewCanvas = async () => {
    const canvas = await createCanvasForSide(activeSide);

    if (!canvas) return;

    openCanvas(canvas);
  };

  const createCanvasForSide = async (side: "front" | "back") => {
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const sideElements = elements[side] || [];

    const backgroundImageUrl =
      side === "front" ? backgroundImage : backgroundImageBack;

    if (backgroundImageUrl) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = backgroundImageUrl;
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

    await drawElements(ctx, sideElements);

    return canvas;
  };

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

  async function drawElements(
    ctx: CanvasRenderingContext2D,
    elementsArray: CanvasElement[],
  ) {
    for (const element of elementsArray) {
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
          content = content.replace(/@nombre/gi, currentPerson.name);
          content = content.replace(/@wcaid/gi, currentPerson.wcaId || "Nuevo");

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

          const regionNames = new Intl.DisplayNames(["es"], { type: "region" });
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

            const teamImage = teams.find(
              (t) => t.stateId === currentPerson.stateId,
            )?.image;

            if (isEventsIcon) {
              // Get person's event IDs
              const personEventIds = currentPerson.registration?.eventIds || [];

              if (personEventIds.length > 0) {
                const spacing = 5;
                const iconSize = element.height;
                const totalWidth =
                  iconSize * personEventIds.length +
                  spacing * (personEventIds.length - 1);

                // Calculate starting X position to center the icons
                const startX = element.x + (element.width - totalWidth) / 2;

                // Load and draw each event icon
                const eventPromises = personEventIds.map((eventId, index) => {
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
          // Replace placeholder text with person's data
          const qrData =
            element.qrDataSource === "wca-live"
              ? `https://live.worldcubeassociation.org/link/competitions/${competitionId}`
              : element.qrDataSource === "competition-groups"
                ? `https://www.competitiongroups.com/competitions/${competitionId}/persons/${currentPerson.registrantId}`
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

                  // Add WCA Live logo in the center if it's a wca-live data source
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
  }

  function openCanvas(canvas: HTMLCanvasElement) {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const newWindow = window.open(url, "_blank");

      // Clean up the URL after the window loads
      if (newWindow) {
        newWindow.onload = () => {
          URL.revokeObjectURL(url);
        };
      }
    });
  }

  const exportToJSON = () => {
    const data = JSON.stringify(
      {
        elements,
        canvasWidth,
        canvasHeight,
        backgroundImage,
        backgroundImageBack,
        enableBackSide,
      },
      null,
      2,
    );
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gafete-${competitionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFromJSON = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (data.elements) setElements(data.elements);
        if (data.canvasWidth && data.canvasHeight)
          setCanvasSize(data.canvasWidth, data.canvasHeight);
        if (data.backgroundImage) setBackgroundImage(data.backgroundImage);
        if (data.backgroundImageBack)
          setBackgroundImageBack(data.backgroundImageBack);
        if (data.enableBackSide !== undefined)
          setEnableBackSide(data.enableBackSide);
      } catch (error) {
        console.error("Failed to import design:", error);
        toast.error(
          "Error al importar el diseño. Verifica que el archivo sea válido.",
        );
      }
    };
    input.click();
  };

  const resetCanvas = () => {
    setElements({ front: [], back: [] });
    setCanvasSize(638, 1011);
    setBackgroundImage(undefined);
    setBackgroundImageBack(undefined);
    setEnableBackSide(false);
    setIsResetDialogOpen(false);
  };

  const DPI = 300;
  const pxToMm = (px: number) => (px * 25.4) / DPI;

  return (
    <div className="h-screen w-full flex flex-col bg-background border">
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-foreground">Gafetes</h1>
          <span className="text-sm text-muted-foreground">
            {pxToMm(canvasWidth).toFixed(1)} × {pxToMm(canvasHeight).toFixed(1)}{" "}
            mm
          </span>
          {enableBackSide && (
            <div className="flex items-center gap-2 border-l pl-4">
              <Button
                variant={activeSide === "front" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveSide("front")}
              >
                Frente
              </Button>
              <Button
                variant={activeSide === "back" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveSide("back")}
              >
                <FlipHorizontal />
                Reverso
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <CanvasSettings />
          <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <RotateCcw />
                Reiniciar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>¿Estás seguro de reiniciar el lienzo?</DialogTitle>
                <DialogDescription>
                  Esta acción eliminará todos los elementos y restablecerá el
                  lienzo a su estado predeterminado. Esta acción no se puede
                  deshacer.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary">
                    Cerrar
                  </Button>
                </DialogClose>
                <Button onClick={resetCanvas}>Reiniciar lienzo</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={importFromJSON}>
            <Upload />
            Importar JSON
          </Button>
          <Button variant="outline" size="sm" onClick={exportToJSON}>
            <Download />
            Exportar JSON
          </Button>
          <Button variant="default" size="sm" onClick={previewCanvas}>
            <Eye />
            Previsualizar
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <Toolbar />
        <CanvasEditor eventIds={eventIds} />
        <PropertiesPanel eventIds={eventIds} />
      </div>
    </div>
  );
}
