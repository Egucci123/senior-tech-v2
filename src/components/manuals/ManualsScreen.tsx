"use client";

import { useState, useEffect } from "react";
import { Search, ExternalLink, Zap } from "lucide-react";
import type { ManualSearch } from "@/types";
import { getManualSearches, createManualSearch } from "@/lib/supabase";
import ManualCard from "./ManualCard";

interface ManualsScreenProps {
  sharedManuals?: ManualSearch[];
  userId?: string;
}

export default function ManualsScreen({ sharedManuals = [], userId }: ManualsScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [localManuals, setLocalManuals] = useState<ManualSearch[]>([]);
  const [dbManuals, setDbManuals] = useState<ManualSearch[]>([]);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [noResults, setNoResults] = useState(false);

  // Load manuals from DB on mount
  useEffect(() => {
    if (!userId) return;
    getManualSearches(userId)
      .then(({ data, error }) => {
        if (!error && data) {
          setDbManuals(data as ManualSearch[]);
        }
      })
      .catch((e) => console.error("Failed to load manuals from DB:", e));
  }, [userId]);

  // Merge: auto-found from diagnostics first, then DB manuals, then manually searched
  const allManuals = [
    ...sharedManuals,
    ...dbManuals.filter(
      (dm) => !sharedManuals.some((sm) => sm.model_number.toLowerCase() === dm.model_number.toLowerCase())
    ),
    ...localManuals.filter(
      (lm) =>
        !sharedManuals.some((sm) => sm.model_number.toLowerCase() === lm.model_number.toLowerCase()) &&
        !dbManuals.some((dm) => dm.model_number.toLowerCase() === lm.model_number.toLowerCase())
    ),
  ];

  const handleSearch = () => {
    const query = searchQuery.trim();
    if (!query) return;

    setSearchPerformed(true);

    // Check if model already exists
    const existing = allManuals.find(
      (m) => m.model_number.toLowerCase() === query.toLowerCase()
    );

    if (existing) {
      setNoResults(false);
      return;
    }

    // Create a new manual search entry with ManualsLib URLs
    const q = encodeURIComponent(query);
    const manualUrls = [
      { type: "INSTALL", url: `https://www.manualslib.com/search/?q=${q}+installation+manual&p=1` },
      { type: "SERVICE", url: `https://www.manualslib.com/search/?q=${q}+service+manual&p=1` },
      { type: "WIRING", url: `https://www.manualslib.com/search/?q=${q}+wiring+diagram&p=1` },
      { type: "PARTS", url: `https://www.manualslib.com/search/?q=${q}+parts+catalog&p=1` },
    ];

    const newManual: ManualSearch = {
      id: crypto.randomUUID(),
      user_id: userId || "",
      model_number: query,
      brand: "",
      search_date: new Date().toISOString(),
      manual_urls: manualUrls,
    };

    setLocalManuals((prev) => [newManual, ...prev]);
    setNoResults(false);
    setSearchQuery("");

    // Persist to DB (fire-and-forget)
    if (userId) {
      createManualSearch(userId, query, "", manualUrls)
        .then(() => {})
        .catch((e) => console.error("Failed to persist manual search:", e));
    }
  };

  const handleDelete = (id: string) => {
    setLocalManuals((prev) => prev.filter((m) => m.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const manualsLibUrl = `https://www.manualslib.com/search/?q=${encodeURIComponent(searchQuery.trim())}`;

  return (
    <div className="px-4 pt-20 pb-24 max-w-lg mx-auto">
      {/* Search Bar */}
      <div className="flex gap-2 mb-6">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchPerformed(false);
              setNoResults(false);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Enter model number..."
            className="w-full h-11 pl-4 pr-4 rounded-lg bg-surface-container border border-outline-variant text-sm text-on-surface placeholder:text-outline/50 focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container/30 transition-colors font-body"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={!searchQuery.trim()}
          className="h-11 px-4 rounded-lg bg-primary-container font-headline font-bold text-xs uppercase tracking-wide text-[#0e0e0e] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          <Search className="w-4 h-4" />
          Search
        </button>
      </div>

      {/* No Results + ManualsLib Fallback */}
      {searchPerformed && noResults && (
        <div className="mb-6 p-4 rounded-lg bg-surface-container-low ghost-border text-center">
          <p className="text-sm text-outline mb-3">
            No cached manuals found for &quot;{searchQuery.trim()}&quot;.
          </p>
          <a
            href={manualsLibUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary-container/10 border border-primary-container/20 font-headline font-bold text-xs uppercase tracking-wide text-primary-container transition-all hover:bg-primary-container/15"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Search ManualsLib
          </a>
        </div>
      )}

      {/* Auto-Found Banner */}
      {sharedManuals.length > 0 && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-primary-container/10 border border-primary-container/20">
          <Zap className="w-4 h-4 text-primary-container flex-shrink-0" />
          <p className="font-headline font-bold text-[10px] uppercase tracking-wider text-primary-container">
            {sharedManuals.length} manual{sharedManuals.length > 1 ? "s" : ""} auto-found from diagnostic
          </p>
        </div>
      )}

      {/* Manuals List */}
      <div>
        <h2 className="font-headline font-bold text-sm uppercase tracking-[-0.02em] text-on-surface mb-3">
          Manuals
        </h2>

        {allManuals.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-outline text-sm">No manuals yet.</p>
            <p className="text-outline/60 text-xs mt-1">
              Upload a data plate photo in DIAGNOSE — manuals are found automatically.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {allManuals.map((manual) => {
              const isAutoFound = sharedManuals.some((sm) => sm.id === manual.id);
              return (
                <div key={manual.id} className="relative">
                  {isAutoFound && (
                    <span className="absolute -top-1.5 right-3 z-10 px-2 py-0.5 rounded bg-primary-container text-[#0e0e0e] font-headline font-bold text-[8px] uppercase tracking-wider">
                      AUTO-FOUND
                    </span>
                  )}
                  <ManualCard
                    manual={manual}
                    onDelete={handleDelete}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
