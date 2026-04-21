"use client";

import { Trash2, BookOpen, Wrench, Zap, Package } from "lucide-react";
import type { ManualSearch } from "@/types";

interface ManualCardProps {
  manual: ManualSearch;
  onDelete: (id: string) => void;
}

/** Infer source tier from URL when source field is missing (legacy data) */
function inferSource(url: string): 1 | 2 | 3 {
  const u = url.toLowerCase();
  if (u.includes("manualslib.com/search")) return 3;
  if (u.includes("manualslib.com"))        return 1;
  return 3;
}

const SOURCE_LABELS: Record<1 | 2 | 3, { label: string; color: string }> = {
  1: { label: "ManualsLib",  color: "text-[#4fc3f7]" },
  2: { label: "ManualsLib",  color: "text-[#4fc3f7]" },
  3: { label: "Search Link", color: "text-outline/60" },
};

/** Per-type display config */
const TYPE_CONFIG: Record<string, { label: string; shortLabel: string; Icon: typeof BookOpen; color: string }> = {
  INSTALL: { label: "Installation Manual", shortLabel: "INSTALL",  Icon: BookOpen, color: "text-[#4fc3f7]" },
  SERVICE: { label: "Service Manual",       shortLabel: "SERVICE",  Icon: Wrench,   color: "text-[#81c784]" },
  WIRING:  { label: "Wiring Diagram",       shortLabel: "WIRING",   Icon: Zap,      color: "text-[#ffb74d]" },
  PARTS:   { label: "Parts Catalog",        shortLabel: "PARTS",    Icon: Package,  color: "text-outline/80" },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG.INSTALL;
}

function formatSearchDate(iso: string): string {
  const d = new Date(iso);
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function ManualCard({ manual, onDelete }: ManualCardProps) {
  const docs = manual.manual_urls ?? [];
  const primaryDoc = docs[0];
  const overallSource = primaryDoc
    ? ((primaryDoc.source ?? inferSource(primaryDoc.url)) as 1 | 2 | 3)
    : 3;
  const srcInfo = SOURCE_LABELS[overallSource];

  return (
    <div className="bg-surface-container-low ghost-border rounded-lg p-4">
      {/* Top row: brand / model + delete */}
      <div className="flex items-start justify-between mb-1">
        <div className="flex-1 min-w-0 pr-2">
          <span className="font-headline font-medium text-[11px] uppercase tracking-wide text-outline">
            {manual.brand}
          </span>
          <h3 className="font-headline font-bold text-base uppercase tracking-[-0.02em] text-on-surface truncate">
            {manual.model_number}
          </h3>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(manual.id);
          }}
          className="p-1.5 rounded-lg opacity-40 hover:opacity-100 hover:bg-error/10 transition-all flex-shrink-0"
          aria-label={`Delete ${manual.model_number}`}
        >
          <Trash2 className="w-4 h-4 text-error" />
        </button>
      </div>

      {/* Source + date */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`font-headline font-bold text-[9px] uppercase tracking-wider ${srcInfo.color}`}>
          {srcInfo.label}
        </span>
        <span className="text-outline/30 text-[9px]">·</span>
        <span className="text-[10px] text-outline/80 font-headline uppercase tracking-wide">
          {formatSearchDate(manual.search_date)}
        </span>
      </div>

      {/* Manual buttons — one per type found */}
      {docs.length === 0 ? (
        <p className="text-xs text-outline/60 font-headline uppercase tracking-wider">
          No document URLs saved
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {docs.map((doc, idx) => {
            const cfg = getTypeConfig(doc.type);
            const Icon = cfg.Icon;
            const src = (doc.source ?? inferSource(doc.url)) as 1 | 2 | 3;
            const isSearchLink = src === 3;

            return (
              <button
                key={idx}
                onClick={() => window.open(doc.url, "_blank", "noopener,noreferrer")}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg
                           bg-surface-container-high font-headline font-bold text-xs
                           uppercase tracking-wide text-on-surface
                           transition-all hover:brightness-125 active:scale-95"
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${cfg.color}`} />
                <span className="flex-1 text-left">
                  {isSearchLink ? `Search ${cfg.label}` : cfg.label}
                </span>
                {isSearchLink && (
                  <span className="text-[9px] text-outline/60 uppercase tracking-wider">
                    SEARCH
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
