"use client";

import { Trash2 } from "lucide-react";
import type { ManualSearch } from "@/types";

interface ManualCardProps {
  manual: ManualSearch;
  onDelete: (id: string) => void;
}

const pillColors: Record<string, string> = {
  INSTALL: "text-[#4fc3f7]",
  SERVICE: "text-[#69cc69]",
  PARTS:   "text-[#ffb74d]",
  WIRING:  "text-[#ce93d8]",
};

/** Infer source tier from URL when the source field is missing (legacy cached data) */
function inferSource(url: string): 1 | 2 | 3 {
  const u = url.toLowerCase();
  if (u.includes("manualslib.com/search")) return 3;
  if (u.includes("manualslib.com")) return 2;
  if (u.includes("google.com") || u.includes("search.brave.com")) return 3;
  return 1; // Manufacturer domain or direct PDF
}

const SOURCE_LABELS: Record<1 | 2 | 3, { label: string; color: string }> = {
  1: { label: "OEM",    color: "text-[#69cc69]" },   // green — direct from manufacturer
  2: { label: "MLIB",   color: "text-[#4fc3f7]" },   // blue — ManualsLib product page
  3: { label: "SEARCH", color: "text-outline/50" },  // gray — search results page
};

function formatSearchDate(iso: string): string {
  const d = new Date(iso);
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function ManualCard({ manual, onDelete }: ManualCardProps) {
  const handlePillClick = (url: string, type: string) => {
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      alert(`No ${type} manual URL available for ${manual.model_number}`);
    }
  };

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

      {/* Search date */}
      <p className="text-[10px] text-outline/60 font-headline uppercase tracking-wide mb-3">
        Searched {formatSearchDate(manual.search_date)}
      </p>

      {/* Document type pills */}
      <div className="flex flex-wrap gap-2">
        {manual.manual_urls.map((doc) => {
          const typeKey = doc.type.toUpperCase();
          const colorClass = pillColors[typeKey] || "text-outline";
          const src = doc.source ?? inferSource(doc.url);
          const srcInfo = SOURCE_LABELS[src];

          return (
            <button
              key={doc.type}
              onClick={() => handlePillClick(doc.url, doc.type)}
              className={`flex flex-col items-center px-2.5 py-1.5 rounded bg-surface-container-high font-headline font-bold transition-all hover:brightness-125 active:scale-95 ${colorClass}`}
            >
              <span className="text-[10px] uppercase tracking-wide leading-none">
                {typeKey}
              </span>
              <span className={`text-[8px] uppercase tracking-wider leading-none mt-0.5 ${srcInfo.color}`}>
                {srcInfo.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
