"use client";

import { Trash2, BookOpen } from "lucide-react";
import type { ManualSearch } from "@/types";

interface ManualCardProps {
  manual: ManualSearch;
  onDelete: (id: string) => void;
}

/** Infer source tier from URL when the source field is missing (legacy cached data) */
function inferSource(url: string): 1 | 2 | 3 {
  const u = url.toLowerCase();
  if (u.includes("manualslib.com/search")) return 3;
  if (u.includes("manualslib.com")) return 2;
  if (u.includes("google.com") || u.includes("search.brave.com")) return 3;
  return 1;
}

const SOURCE_LABELS: Record<1 | 2 | 3, { label: string; color: string }> = {
  1: { label: "OEM PDF",      color: "text-[#69cc69]" },
  2: { label: "ManualsLib",   color: "text-[#4fc3f7]" },
  3: { label: "Search",       color: "text-outline/70" },
};

function formatSearchDate(iso: string): string {
  const d = new Date(iso);
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function ManualCard({ manual, onDelete }: ManualCardProps) {
  // Use the first (and typically only) URL — the installation manual
  const doc = manual.manual_urls[0];

  const handleOpen = () => {
    if (doc?.url) {
      window.open(doc.url, "_blank", "noopener,noreferrer");
    }
  };

  const src = doc ? (doc.source ?? inferSource(doc.url)) : 3;
  const srcInfo = SOURCE_LABELS[src];

  return (
    <div className="bg-surface-container-low ghost-border rounded-lg p-4 group">
      {/* Top row: brand/model + delete */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <span className="font-headline font-medium text-[11px] uppercase tracking-wide text-outline">
            {manual.brand}
          </span>
          <h3 className="font-headline font-bold text-base uppercase tracking-[-0.02em] text-on-surface">
            {manual.model_number}
          </h3>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(manual.id);
          }}
          className="p-1.5 rounded-lg opacity-40 hover:opacity-100 hover:bg-error/10 transition-all"
          aria-label={`Delete ${manual.model_number}`}
        >
          <Trash2 className="w-4 h-4 text-error" />
        </button>
      </div>

      {/* Source badge + date */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`font-headline font-bold text-[9px] uppercase tracking-wider ${srcInfo.color}`}>
          {srcInfo.label}
        </span>
        <span className="text-outline/30 text-[9px]">·</span>
        <span className="text-[10px] text-outline/80 font-headline uppercase tracking-wide">
          {formatSearchDate(manual.search_date)}
        </span>
      </div>

      {/* Single open button */}
      <button
        onClick={handleOpen}
        disabled={!doc?.url}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-surface-container-high font-headline font-bold text-xs uppercase tracking-wide text-on-surface transition-all hover:brightness-125 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <BookOpen className="w-4 h-4" />
        Open Manual
      </button>
    </div>
  );
}
