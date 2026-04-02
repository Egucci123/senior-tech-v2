"use client";

import { useState, useEffect, useCallback } from "react";
import type { ManualSearch } from "@/types";
import { getManualSearches, createManualSearch } from "@/lib/supabase";
import { isSameModel, getBaseModel } from "@/lib/model-utils";

/**
 * Module-level store for manuals shared between chat and manuals screen.
 * No Context/Provider needed — both screens live in the same page.tsx.
 */
let _manuals: ManualSearch[] = [];
let _hasNew = false;
let _listeners: Set<() => void> = new Set();
let _dbLoaded = false;

function notify() {
  _listeners.forEach((fn) => fn());
}

/** Load manuals from the database and merge with in-memory store */
export async function loadFromDb(userId: string) {
  if (_dbLoaded) return;
  try {
    const { data, error } = await getManualSearches(userId);
    if (!error && data) {
      const dbManuals = data as ManualSearch[];
      // Merge DB manuals with in-memory ones, avoiding duplicates by model identity
      for (const dbManual of dbManuals) {
        const exists = _manuals.some((m) => isSameModel(m.model_number, dbManual.model_number));
        if (!exists) {
          _manuals.push(dbManual);
        }
      }
      _dbLoaded = true;
      notify();
    }
  } catch (e) {
    console.error("Failed to load manuals from DB:", e);
  }
}

/** Called from useChat when a model number is extracted from AI response */
export function addManual(manual: ManualSearch, userId?: string) {
  // Normalize to base model before storing — prevents ZE060H12A2A1ABA1A2 vs ZE060 duplicates
  const normalizedManual = {
    ...manual,
    model_number: getBaseModel(manual.model_number),
  };
  // Avoid duplicates — full config strings and base models are the same unit
  const exists = _manuals.some((m) => isSameModel(m.model_number, normalizedManual.model_number));
  if (!exists) {
    _manuals = [normalizedManual, ..._manuals];
    _hasNew = true;
    notify();

    // Persist to DB (fire-and-forget) if userId available
    if (userId) {
      createManualSearch(userId, normalizedManual.model_number, normalizedManual.brand, normalizedManual.manual_urls)
        .then(() => {})
        .catch((e) => console.error("Failed to persist manual search:", e));
    }
  }
}

export function useManuals() {
  const [manuals, setManuals] = useState<ManualSearch[]>(_manuals);
  const [hasNew, setHasNew] = useState(_hasNew);

  useEffect(() => {
    const listener = () => {
      setManuals([..._manuals]);
      setHasNew(_hasNew);
    };
    _listeners.add(listener);
    // Sync state on mount in case store was updated before listener was added
    listener();
    return () => {
      _listeners.delete(listener);
    };
  }, []);

  const clearNew = useCallback(() => {
    _hasNew = false;
    setHasNew(false);
  }, []);

  return { manuals, hasNew, clearNew };
}
