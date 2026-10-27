"use client";

import type React from "react";
import { useRef, useEffect, useLayoutEffect, useState } from "react";
import { useCanvasStore } from "@/lib/canvas-store";
import { canvasFont, ensureFontLoaded } from "@/lib/load-fonts";
import { drawBackground, drawElement, drawGuides } from "@/lib/canvas-draw";
import {
  getResizeHandle,
  hitTest,
  isPointInBox,
  isResizeLargeEnough,
  resizeElementBox,
  scaleFontSize,
  snapToGuides,
  type Guides,
  type ResizeHandle,
} from "@/lib/canvas-geometry";
import { ZoomControls } from "./zoom-controls";
import type { EventId } from "@/types/wcif";
import type { CanvasElement } from "@/types/canvas";

const NO_ELEMENTS: CanvasElement[] = [];

interface CanvasEditorProps {
  eventIds: EventId[];
}

export function CanvasEditor({
  eventIds,
}: CanvasEditorProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const backgroundImageBackRef = useRef<HTMLImageElement | null>(null);
  // Add cache for element images
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  // Latest drawCanvas, so async loaders and effects redraw with current state
  const drawCanvasRef = useRef<() => void>(() => {});

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
  const currentElements = elements[activeSide] ?? NO_ELEMENTS;

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);
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
  const [guides, setGuides] = useState<Guides>({
    horizontal: null,
    vertical: null,
  });

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
            drawCanvasRef.current(); // Redraw when image loads
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
  }, [currentElements]);

  // Redraw once the fonts used by text elements finish loading
  const textFonts = currentElements
    .filter((element) => element.type === "text")
    .map((element) => `${element.fontWeight || "normal"}|${element.fontFamily}`)
    .sort()
    .join(",");
  useEffect(() => {
    if (!textFonts) return;
    let cancelled = false;
    void Promise.all(
      textFonts.split(",").map((entry) => {
        const [weight = "normal", family = ""] = entry.split("|");
        return ensureFontLoaded(family, weight);
      }),
    ).then(() => {
      if (!cancelled) drawCanvasRef.current();
    });
    return () => {
      cancelled = true;
    };
  }, [textFonts]);

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
        drawCanvasRef.current();
      };
    } else {
      targetRef.current = null;
      drawCanvasRef.current();
    }
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

    ctx.font = canvasFont(fontWeight, fontSize, fontFamily);
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

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const currentBackgroundRef =
      activeSide === "front" ? backgroundImageRef : backgroundImageBackRef;
    drawBackground(ctx, currentBackgroundRef.current);

    currentElements.forEach((element) => {
      drawElement(
        ctx,
        element,
        imageCache.current,
        element.id === selectedElementId,
      );
    });

    drawGuides(ctx, guides);
  };

  useLayoutEffect(() => {
    drawCanvasRef.current = drawCanvas;
  });

  useEffect(() => {
    drawCanvasRef.current();
  }, [
    currentElements,
    selectedElementId,
    canvasWidth,
    canvasHeight,
    activeSide,
    guides,
  ]);

  const toCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / (scale * zoom),
      y: (e.clientY - rect.top) / (scale * zoom),
    };
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = toCanvasPoint(e);
    if (!point) return;

    const clickedElement = hitTest(currentElements, point.x, point.y);

    if (clickedElement && clickedElement.type === "text") {
      setIsEditingText(true);
      setEditingText(clickedElement.content || "");
      setTimeout(() => textInputRef.current?.focus(), 0);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = toCanvasPoint(e);
    if (!point) return;
    const { x, y } = point;

    const clickedElement = hitTest(currentElements, x, y);

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

    const point = toCanvasPoint(e);
    if (!point) return;
    const { x, y } = point;
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
    if (isPointInBox(x, y, selectedElement)) {
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = toCanvasPoint(e);
    if (!point) return;
    const { x, y } = point;

    if (isResizing && selectedElementId && resizeHandle) {
      const selectedElement = currentElements.find(
        (el) => el.id === selectedElementId,
      );
      if (!selectedElement) return;

      const resized = resizeElementBox({
        element: selectedElement,
        handle: resizeHandle,
        start: resizeStart,
        x,
        y,
        eventCount: eventIds.length,
      });
      if (!isResizeLargeEnough(resized)) return;

      if (selectedElement.type === "text") {
        const newFontSize = scaleFontSize(
          resizeStart.fontSize || 24,
          resizeStart,
          resized,
        );

        const content = selectedElement.content || "";
        const dimensions = measureText(
          content,
          newFontSize,
          selectedElement.fontFamily || "sans-serif",
          selectedElement.fontWeight || "normal",
        );

        updateElement(selectedElementId, {
          x: resized.x,
          y: resized.y,
          width: dimensions.width,
          height: dimensions.height,
          fontSize: newFontSize,
        });
      } else {
        updateElement(selectedElementId, resized);
      }
      return;
    }

    if (isDragging && selectedElementId) {
      const selectedElement = currentElements.find(
        (el) => el.id === selectedElementId,
      );
      if (!selectedElement) return;

      const snapped = snapToGuides({
        element: selectedElement,
        x: x - dragOffset.x,
        y: y - dragOffset.y,
        elements: currentElements,
        canvasWidth,
        canvasHeight,
      });

      setGuides(snapped.guides);

      updateElement(selectedElementId, {
        x: snapped.x,
        y: snapped.y,
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
