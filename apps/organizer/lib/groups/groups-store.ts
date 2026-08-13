"use client";

import { create } from "zustand";
import type { WCIF } from "@/types/wcif";
import { deepCloneWcif } from "@/lib/groups/wcif-schedule";

interface GroupsStore {
  originalWcif: WCIF | null;
  draftWcif: WCIF | null;
  selectedRoundId: string | null;
  selectedActivityId: number | null;
  isDirty: boolean;
  load: (wcif: WCIF) => void;
  replaceDraft: (wcif: WCIF) => void;
  resetAll: () => void;
  setSelectedRoundId: (roundId: string | null) => void;
  setSelectedActivityId: (activityId: number | null) => void;
}

function computeDirty(original: WCIF | null, draft: WCIF | null): boolean {
  if (!original || !draft) return false;
  return JSON.stringify(original) !== JSON.stringify(draft);
}

export const useGroupsStore = create<GroupsStore>((set, get) => ({
  originalWcif: null,
  draftWcif: null,
  selectedRoundId: null,
  selectedActivityId: null,
  isDirty: false,

  load: (wcif) => {
    const clone = deepCloneWcif(wcif);
    const firstRound = wcif.events[0]?.rounds[0]?.id ?? null;
    set({
      originalWcif: deepCloneWcif(wcif),
      draftWcif: clone,
      selectedRoundId: firstRound,
      selectedActivityId: null,
      isDirty: false,
    });
  },

  replaceDraft: (wcif) => {
    const { originalWcif } = get();
    set({
      draftWcif: wcif,
      isDirty: computeDirty(originalWcif, wcif),
    });
  },

  resetAll: () => {
    const { originalWcif } = get();
    if (!originalWcif) return;
    set({
      draftWcif: deepCloneWcif(originalWcif),
      isDirty: false,
      selectedActivityId: null,
    });
  },

  setSelectedRoundId: (roundId) =>
    set({ selectedRoundId: roundId, selectedActivityId: null }),

  setSelectedActivityId: (activityId) =>
    set({ selectedActivityId: activityId }),
}));
