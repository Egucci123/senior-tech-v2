"use client";

import { useState, useEffect, useCallback } from "react";
import type { ManualSearch } from "@/types";

/**
 * Module-level store for manuals shared between chat and manuals screen.
 * No Context/Provider needed — both screens live in the same page.tsx.
 */
let _manuals: ManualSearch[] = [];
let _hasNew = false;
let _listeners: Set<() => void> = new Set();

function notify() {
  _listeners.forEach((fn) => fn());
}

/** Called from useChat when a model number is extracted from AI response */
export function addManual(manual: ManualSearch) {
  // Avoid duplicates by model_number (case-insensitive)
  const exists = _manuals.some(
    (m) => m.model_number.toLowerCase() === manual.model_number.toLowerCase()
  );
  if (!exists) {
    _manuals = [manual, ..._manuals];
    _hasNew = true;
    notify();
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
