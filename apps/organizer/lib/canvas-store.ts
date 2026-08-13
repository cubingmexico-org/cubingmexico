"use client";

import { create } from "zustand";
import type { CanvasElement, CanvasState } from "@/types/canvas";
import { clampElementToCanvas } from "@/lib/canvas-bounds";

function clampElement(
  element: CanvasElement,
  canvasWidth: number,
  canvasHeight: number,
): CanvasElement {
  return {
    ...element,
    ...clampElementToCanvas(element, canvasWidth, canvasHeight),
  };
}

function clampElements(
  elements: CanvasElement[],
  canvasWidth: number,
  canvasHeight: number,
): CanvasElement[] {
  return elements.map((el) => clampElement(el, canvasWidth, canvasHeight));
}

interface CanvasStore extends CanvasState {
  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  selectElement: (id: string | null) => void;
  clearCanvas: () => void;
  setCanvasSize: (width: number, height: number) => void;
  setBackgroundImage: (imageUrl: string | undefined) => void;
  setBackgroundImageBack: (imageUrl: string | undefined) => void;
  setElements: (elements: {
    front: CanvasElement[];
    back: CanvasElement[];
  }) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  setActiveSide: (side: "front" | "back") => void;
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  elements: {
    front: [],
    back: [],
  },
  enableBackSide: false,
  setEnableBackSide: (enable) => set({ enableBackSide: enable }),
  selectedElementId: null,
  canvasWidth: 638,
  canvasHeight: 1011,
  backgroundImage: undefined,
  backgroundImageBack: undefined,
  zoom: 1,
  activeSide: "front",

  addElement: (element) =>
    set((state) => ({
      elements: {
        ...state.elements,
        [state.activeSide]: [
          ...state.elements[state.activeSide],
          clampElement(element, state.canvasWidth, state.canvasHeight),
        ],
      },
      selectedElementId: element.id,
    })),

  updateElement: (id, updates) =>
    set((state) => ({
      elements: {
        ...state.elements,
        [state.activeSide]: state.elements[state.activeSide].map((el) => {
          if (el.id !== id) return el;
          const merged = { ...el, ...updates };
          if (
            updates.x !== undefined ||
            updates.y !== undefined ||
            updates.width !== undefined ||
            updates.height !== undefined
          ) {
            return clampElement(merged, state.canvasWidth, state.canvasHeight);
          }
          return merged;
        }),
      },
    })),

  deleteElement: (id) =>
    set((state) => ({
      elements: {
        ...state.elements,
        [state.activeSide]: state.elements[state.activeSide].filter(
          (el) => el.id !== id,
        ),
      },
      selectedElementId:
        state.selectedElementId === id ? null : state.selectedElementId,
    })),

  selectElement: (id) => set({ selectedElementId: id }),

  clearCanvas: () =>
    set((state) => ({
      elements: {
        ...state.elements,
        [state.activeSide]: [],
      },
      selectedElementId: null,
    })),

  setCanvasSize: (width, height) =>
    set((state) => ({
      canvasWidth: width,
      canvasHeight: height,
      elements: {
        front: clampElements(state.elements.front, width, height),
        back: clampElements(state.elements.back, width, height),
      },
    })),

  setBackgroundImage: (imageUrl) => set({ backgroundImage: imageUrl }),

  setBackgroundImageBack: (imageUrl) => set({ backgroundImageBack: imageUrl }),

  setElements: (elements) =>
    set((state) => ({
      elements: {
        front: clampElements(
          elements.front,
          state.canvasWidth,
          state.canvasHeight,
        ),
        back: clampElements(
          elements.back,
          state.canvasWidth,
          state.canvasHeight,
        ),
      },
      selectedElementId: null,
    })),

  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(3, zoom)) }),

  setActiveSide: (side) => set({ activeSide: side, selectedElementId: null }),
}));
