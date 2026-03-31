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
  PARTS: "text-[#ffb74d]",
  WIRING: "text-[#ce93d8]",
};

function formatSearchDate(iso: string): string {
  const d = new Date(iso);
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
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
          const colorClass = pillColors[doc.type.toUpperCase()] || "text-outline";
          return (
            <button
              key={doc.type}
              onClick={() => handlePillClick(doc.url, doc.type)}
              className={`px-2.5 py-1 rounded bg-surface-container-high font-headline font-bold text-[10px] uppercase tracking-wide transition-all hover:brightness-125 active:scale-95 ${colorClass}`}
            >
              {doc.type.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
