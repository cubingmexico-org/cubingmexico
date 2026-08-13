"use client";

import type React from "react";
import { useRef, useEffect, useState } from "react";
import { useCanvasStore } from "@/lib/canvas-store";
import { ZoomControls } from "./zoom-controls";
import type { EventId } from "@/types/wcif";

interface CanvasEditorProps {
  eventIds: EventId[];
}

// Snap threshold in pixels
const SNAP_THRESHOLD = 5;

export function CanvasEditor({
  eventIds,
}: CanvasEditorProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const backgroundImageBackRef = useRef<HTMLImageElement | null>(null);
  // Add cache for element images
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  const {
    elements,
    selectedElementId,
    selectElement,
    updateElement,
    canvasWidth,
    canvasHeight,
    backgroundImage,
    backgroundImageBack,
    zoom,
    activeSide,
  } = useCanvasStore();

  // Get elements for the active side
  const currentElements = elements[activeSide] || [];

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    fontSize: 0,
  });
  const [isEditingText, setIsEditingText] = useState(false);
  const [editingText, setEditingText] = useState("");
  const textInputRef = useRef<HTMLInputElement>(null);

  // Smart guides state
  const [guides, setGuides] = useState<{
    horizontal: number | null;
    vertical: number | null;
  }>({ horizontal: null, vertical: null });

  // Preload and cache images
  useEffect(() => {
    currentElements.forEach((element) => {
      if (element.type === "image" && element.imageUrl) {
        // Only create new image if not already cached
        if (!imageCache.current.has(element.imageUrl)) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = element.imageUrl;
          img.onload = () => {
            imageCache.current.set(element.imageUrl!, img);
            drawCanvas(); // Redraw when image loads
          };
          img.onerror = () => {
            console.error(`Failed to load image: ${element.imageUrl}`);
          };
        }
      }
    });

    // Clean up unused images from cache
    const currentUrls = new Set(
      currentElements
        .filter((el) => el.type === "image" && el.imageUrl)
        .map((el) => el.imageUrl!),
    );

    imageCache.current.forEach((_, url) => {
      if (!currentUrls.has(url)) {
        imageCache.current.delete(url);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentElements]);

  useEffect(() => {
    // Load the appropriate background image based on active side
    const currentBackground =
      activeSide === "front" ? backgroundImage : backgroundImageBack;
    const targetRef =
      activeSide === "front" ? backgroundImageRef : backgroundImageBackRef;

    if (currentBackground) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = currentBackground;
      img.onload = () => {
        targetRef.current = img;
        // Trigger a redraw after image loads
        drawCanvas();
      };
    } else {
      targetRef.current = null;
      drawCanvas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backgroundImage, backgroundImageBack, activeSide]);

  const measureText = (
    text: string,
    fontSize: number,
    fontFamily: string,
    fontWeight: string,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { width: 0, height: fontSize };

    const ctx = canvas.getContext("2d");
    if (!ctx) return { width: 0, height: fontSize };

    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const metrics = ctx.measureText(text);
    return {
      width: metrics.width,
      height: fontSize * 1.2, // Add some padding for height
    };
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background based on active side
    const currentBackgroundRef =
      activeSide === "front" ? backgroundImageRef : backgroundImageBackRef;

    if (currentBackgroundRef.current && currentBackgroundRef.current.complete) {
      ctx.drawImage(
        currentBackgroundRef.current,
        0,
        0,
        canvas.width,
        canvas.height,
      );
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw elements
    currentElements.forEach((element) => {
      ctx.save();

      // Set element opacity
      ctx.globalAlpha = element.opacity !== undefined ? element.opacity : 1;

      // Apply transformations
      const centerX = element.x + element.width / 2;
      const centerY = element.y + element.height / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate((element.rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);

      // Draw based on type
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
          const fontSize = element.fontSize || 24;
          const fontFamily = element.fontFamily || "sans-serif";
          const fontWeight = element.fontWeight || "normal";
          const content = element.content || "";

          // Apply drop shadow if enabled
          if (element.dropShadow?.enabled) {
            ctx.shadowColor = element.dropShadow.color || "#000000";
            ctx.shadowBlur = element.dropShadow.blur || 4;
            ctx.shadowOffsetX = element.dropShadow.offsetX || 2;
            ctx.shadowOffsetY = element.dropShadow.offsetY || 2;
          }

          ctx.fillStyle = element.color || "#000000";
          ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
          ctx.textAlign = element.textAlign || "left";

          let textX = element.x;
          if (element.textAlign === "center") {
            textX = element.x + element.width / 2;
          } else if (element.textAlign === "right") {
            textX = element.x + element.width;
          }

          ctx.fillText(content, textX, element.y + fontSize);

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
            const cachedImg = imageCache.current.get(element.imageUrl);
            if (cachedImg && cachedImg.complete) {
              if (element.borderRadius && element.borderRadius > 0) {
                ctx.save();
                ctx.beginPath();

                if (element.borderRadius === 50) {
                  const centerX = element.x + element.width / 2;
                  const centerY = element.y + element.height / 2;
                  const radius = Math.min(element.width, element.height) / 2;
                  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                } else {
                  const maxRadius = Math.min(element.width, element.height) / 2;
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

              ctx.drawImage(
                cachedImg,
                element.x,
                element.y,
                element.width,
                element.height,
              );

              if (element.borderRadius && element.borderRadius > 0) {
                ctx.restore();
              }
            } else {
              ctx.fillStyle = "#e5e7eb";
              ctx.fillRect(element.x, element.y, element.width, element.height);
              ctx.fillStyle = "#9ca3af";
              ctx.font = "16px sans-serif";
              ctx.textAlign = "center";
              ctx.fillText(
                "Cargando...",
                element.x + element.width / 2,
                element.y + element.height / 2,
              );
              ctx.textAlign = "left";
            }
          } else {
            ctx.fillStyle = "#e5e7eb";
            ctx.fillRect(element.x, element.y, element.width, element.height);
            ctx.fillStyle = "#9ca3af";
            ctx.font = "16px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(
              "Image",
              element.x + element.width / 2,
              element.y + element.height / 2,
            );
            ctx.textAlign = "left";
          }
          break;

        case "qrcode": {
          ctx.fillStyle = element.qrBackground || "#ffffff";
          ctx.fillRect(element.x, element.y, element.width, element.height);

          ctx.strokeStyle = element.qrForeground || "#000000";
          ctx.lineWidth = 2;
          ctx.strokeRect(element.x, element.y, element.width, element.height);

          ctx.fillStyle = element.qrForeground || "#000000";
          ctx.font = "14px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(
            "Código QR",
            element.x + element.width / 2,
            element.y + element.height / 2 - 10,
          );

          if (element.qrData) {
            ctx.font = "10px sans-serif";
            const maxLength = 20;
            const displayText =
              element.qrData.length > maxLength
                ? element.qrData.substring(0, maxLength) + "..."
                : element.qrData;
            ctx.fillText(
              displayText,
              element.x + element.width / 2,
              element.y + element.height / 2 + 10,
            );
          }
          ctx.textAlign = "left";
          break;
        }
      }

      // Draw selection border
      if (element.id === selectedElementId) {
        ctx.globalAlpha = 1; // <-- Always opaque for border and handles
        ctx.strokeStyle = "#6366f1";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
          element.x - 2,
          element.y - 2,
          element.width + 4,
          element.height + 4,
        );
        ctx.setLineDash([]);

        const handleSize = 8;
        const handles = [
          { x: element.x - handleSize / 2, y: element.y - handleSize / 2 },
          {
            x: element.x + element.width - handleSize / 2,
            y: element.y - handleSize / 2,
          },
          {
            x: element.x - handleSize / 2,
            y: element.y + element.height - handleSize / 2,
          },
          {
            x: element.x + element.width - handleSize / 2,
            y: element.y + element.height - handleSize / 2,
          },
        ];

        ctx.fillStyle = "#6366f1";
        handles.forEach((handle) => {
          ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
        });
      }

      ctx.restore();
      // Reset opacity for next element
      ctx.globalAlpha = 1;
    });

    // Draw smart guides
    ctx.save();
    ctx.strokeStyle = "#f43f5e";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    // Draw horizontal center guide
    if (guides.horizontal !== null) {
      ctx.beginPath();
      ctx.moveTo(0, guides.horizontal);
      ctx.lineTo(canvas.width, guides.horizontal);
      ctx.stroke();
    }

    // Draw vertical center guide
    if (guides.vertical !== null) {
      ctx.beginPath();
      ctx.moveTo(guides.vertical, 0);
      ctx.lineTo(guides.vertical, canvas.height);
      ctx.stroke();
    }

    ctx.restore();
  };

  useEffect(() => {
    drawCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentElements,
    selectedElementId,
    canvasWidth,
    canvasHeight,
    activeSide,
    guides,
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getResizeHandle = (x: number, y: number, element: any) => {
    const handleSize = 8;
    const handles = [
      {
        name: "top-left",
        x: element.x - handleSize / 2,
        y: element.y - handleSize / 2,
      },
      {
        name: "top-right",
        x: element.x + element.width - handleSize / 2,
        y: element.y - handleSize / 2,
      },
      {
        name: "bottom-left",
        x: element.x - handleSize / 2,
        y: element.y + element.height - handleSize / 2,
      },
      {
        name: "bottom-right",
        x: element.x + element.width - handleSize / 2,
        y: element.y + element.height - handleSize / 2,
      },
    ];

    for (const handle of handles) {
      if (
        x >= handle.x &&
        x <= handle.x + handleSize &&
        y >= handle.y &&
        y <= handle.y + handleSize
      ) {
        return handle.name;
      }
    }
    return null;
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / (scale * zoom);
    const y = (e.clientY - rect.top) / (scale * zoom);

    const clickedElement = [...currentElements].reverse().find((element) => {
      return (
        x >= element.x &&
        x <= element.x + element.width &&
        y >= element.y &&
        y <= element.y + element.height
      );
    });

    if (clickedElement && clickedElement.type === "text") {
      setIsEditingText(true);
      setEditingText(clickedElement.content || "");
      setTimeout(() => textInputRef.current?.focus(), 0);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / (scale * zoom);
    const y = (e.clientY - rect.top) / (scale * zoom);

    // Find clicked element (reverse order to check top elements first)
    const clickedElement = [...currentElements].reverse().find((element) => {
      return (
        x >= element.x &&
        x <= element.x + element.width &&
        y >= element.y &&
        y <= element.y + element.height
      );
    });

    if (clickedElement) {
      selectElement(clickedElement.id);
      setDragOffset({
        x: x - clickedElement.x,
        y: y - clickedElement.y,
      });
    } else {
      selectElement(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedElementId) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / (scale * zoom);
    const y = (e.clientY - rect.top) / (scale * zoom);
    const selectedElement = currentElements.find(
      (el) => el.id === selectedElementId,
    );
    if (!selectedElement) return;

    // Check if clicking on a resize handle first
    const handle = getResizeHandle(x, y, selectedElement);
    if (handle) {
      setIsResizing(true);
      setResizeHandle(handle);
      setResizeStart({
        x: selectedElement.x,
        y: selectedElement.y,
        width: selectedElement.width,
        height: selectedElement.height,
        fontSize: selectedElement.fontSize || 24,
      });
      return;
    }

    // Only start dragging if clicking within the element's bounds
    const isWithinElement =
      x >= selectedElement.x &&
      x <= selectedElement.x + selectedElement.width &&
      y >= selectedElement.y &&
      y <= selectedElement.y + selectedElement.height;

    if (isWithinElement) {
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / (scale * zoom);
    const y = (e.clientY - rect.top) / (scale * zoom);

    if (isResizing && selectedElementId && resizeHandle) {
      const selectedElement = currentElements.find(
        (el) => el.id === selectedElementId,
      );
      if (!selectedElement) return;

      let newX = resizeStart.x;
      let newY = resizeStart.y;
      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;

      switch (resizeHandle) {
        case "top-left":
          newWidth = resizeStart.width + (resizeStart.x - x);
          newHeight = resizeStart.height + (resizeStart.y - y);
          newX = x;
          newY = y;
          break;
        case "top-right":
          newWidth = x - resizeStart.x;
          newHeight = resizeStart.height + (resizeStart.y - y);
          newY = y;
          break;
        case "bottom-left":
          newWidth = resizeStart.width + (resizeStart.x - x);
          newHeight = y - resizeStart.y;
          newX = x;
          break;
        case "bottom-right":
          newWidth = x - resizeStart.x;
          newHeight = y - resizeStart.y;
          break;
      }

      if (
        (selectedElement.type === "image" ||
          selectedElement.type === "qrcode") &&
        selectedElement.keepAspectRatio
      ) {
        const size = Math.max(newWidth, newHeight);
        newWidth = size;
        newHeight = size;

        if (resizeHandle === "top-left") {
          newX = resizeStart.x + resizeStart.width - size;
          newY = resizeStart.y + resizeStart.height - size;
        } else if (resizeHandle === "top-right") {
          newY = resizeStart.y + resizeStart.height - size;
        } else if (resizeHandle === "bottom-left") {
          newX = resizeStart.x + resizeStart.width - size;
        }
      }

      if (selectedElement.imageUrl === "/country.svg") {
        newHeight = (newWidth * 4) / 7;
      }

      if (selectedElement.imageUrl === "/events.svg") {
        const iconSize = newHeight;
        const spacing = 5;
        const totalWidth =
          iconSize * eventIds.length + spacing * (eventIds.length - 1);
        newWidth = totalWidth;
      }

      if (selectedElement.type === "text" && newWidth > 20 && newHeight > 20) {
        const widthRatio = newWidth / resizeStart.width;
        const heightRatio = newHeight / resizeStart.height;
        const scaleRatio = Math.min(widthRatio, heightRatio);
        const newFontSize = Math.max(
          8,
          (resizeStart.fontSize || 24) * scaleRatio,
        );

        const content = selectedElement.content || "";
        const dimensions = measureText(
          content,
          newFontSize,
          selectedElement.fontFamily || "sans-serif",
          selectedElement.fontWeight || "normal",
        );

        updateElement(selectedElementId, {
          x: newX,
          y: newY,
          width: dimensions.width,
          height: dimensions.height,
          fontSize: newFontSize,
        });
      } else if (newWidth > 20 && newHeight > 20) {
        updateElement(selectedElementId, {
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        });
      }
      return;
    }

    // Handle dragging with smart guides
    if (isDragging && selectedElementId) {
      const selectedElement = currentElements.find(
        (el) => el.id === selectedElementId,
      );
      if (!selectedElement) return;

      let newX = x - dragOffset.x;
      let newY = y - dragOffset.y;

      // Calculate element center
      const elementCenterX = newX + selectedElement.width / 2;
      const elementCenterY = newY + selectedElement.height / 2;

      // Canvas center
      const canvasCenterX = canvasWidth / 2;
      const canvasCenterY = canvasHeight / 2;

      // Check for alignment with canvas center
      let horizontalGuide: number | null = null;
      let verticalGuide: number | null = null;

      // Snap to vertical center (horizontal guide line)
      if (Math.abs(elementCenterY - canvasCenterY) < SNAP_THRESHOLD) {
        newY = canvasCenterY - selectedElement.height / 2;
        horizontalGuide = canvasCenterY;
      }

      // Snap to horizontal center (vertical guide line)
      if (Math.abs(elementCenterX - canvasCenterX) < SNAP_THRESHOLD) {
        newX = canvasCenterX - selectedElement.width / 2;
        verticalGuide = canvasCenterX;
      }

      // Check alignment with other elements
      currentElements.forEach((element) => {
        if (element.id === selectedElementId) return;

        const otherCenterX = element.x + element.width / 2;
        const otherCenterY = element.y + element.height / 2;

        // Snap to other element's vertical center
        if (
          horizontalGuide === null &&
          Math.abs(elementCenterY - otherCenterY) < SNAP_THRESHOLD
        ) {
          newY = otherCenterY - selectedElement.height / 2;
          horizontalGuide = otherCenterY;
        }

        // Snap to other element's horizontal center
        if (
          verticalGuide === null &&
          Math.abs(elementCenterX - otherCenterX) < SNAP_THRESHOLD
        ) {
          newX = otherCenterX - selectedElement.width / 2;
          verticalGuide = otherCenterX;
        }
      });

      setGuides({ horizontal: horizontalGuide, vertical: verticalGuide });

      updateElement(selectedElementId, {
        x: newX,
        y: newY,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
    // Clear guides when done dragging
    setGuides({ horizontal: null, vertical: null });
  };

  const handleTextEditComplete = () => {
    if (selectedElementId && isEditingText) {
      const selectedElement = currentElements.find(
        (el) => el.id === selectedElementId,
      );
      if (selectedElement) {
        const fontSize = selectedElement.fontSize || 24;
        const fontFamily = selectedElement.fontFamily || "sans-serif";
        const fontWeight = selectedElement.fontWeight || "normal";

        const dimensions = measureText(
          editingText || "",
          fontSize,
          fontFamily,
          fontWeight,
        );

        updateElement(selectedElementId, {
          content: editingText,
          width: dimensions.width,
          height: dimensions.height,
        });
      }
    }
    setIsEditingText(false);
    setEditingText("");
  };

  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const scaleX = containerWidth / canvasWidth;
      const scaleY = containerHeight / canvasHeight;
      setScale(Math.min(scaleX, scaleY, 1));
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [canvasWidth, canvasHeight]);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center w-[calc(100%-25rem)] h-full bg-muted/30 p-8"
    >
      <div
        className="relative"
        style={{
          transform: `scale(${scale * zoom})`,
          transformOrigin: "center",
        }}
      >
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          onClick={handleCanvasClick}
          onDoubleClick={handleCanvasDoubleClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="bg-white shadow-2xl cursor-pointer"
        />
        {isEditingText && selectedElementId && (
          <input
            ref={textInputRef}
            type="text"
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            onBlur={handleTextEditComplete}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleTextEditComplete();
              }
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-2 text-lg rounded-md focus:outline-none focus:ring-0 text-black"
            style={{ minWidth: "200px" }}
          />
        )}
      </div>
      <ZoomControls />
    </div>
  );
}
