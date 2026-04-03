"use client";

import { useState } from "react";
import { Flag, X, Check, ChevronDown } from "lucide-react";
import { createCorrection } from "@/lib/supabase";

interface FlagButtonProps {
  messageContent: string;
  userId?: string;
  sessionId?: string;
  brand?: string;
  model?: string;
  serial?: string;
}

const CATEGORIES = [
  { key: "serial_date",  label: "Wrong date / age" },
  { key: "unit_type",    label: "Wrong unit type" },
  { key: "brand",        label: "Wrong brand" },
  { key: "specs",        label: "Wrong specs" },
  { key: "manual",       label: "Wrong manual" },
  { key: "other",        label: "Other" },
];

export default function FlagButton({ messageContent, userId, sessionId, brand, model, serial }: FlagButtonProps) {
  const [open, setOpen]         = useState(false);
  const [category, setCategory] = useState("");
  const [correction, setCorrection] = useState("");
  const [submitted, setSubmitted]   = useState(false);
  const [saving, setSaving]         = useState(false);

  async function handleSubmit() {
    if (!category) return;
    setSaving(true);
    try {
      await createCorrection({
        user_id: userId || "00000000-0000-0000-0000-000000000000",
        session_id: sessionId,
        brand,
        model,
        serial,
        error_category: category,
        correct_value: correction.trim() || undefined,
        ai_response_excerpt: messageContent.slice(0, 500),
      });
      setSubmitted(true);
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setCategory("");
        setCorrection("");
      }, 1500);
    } catch {
      /* noop */
    } finally {
      setSaving(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-1.5 mt-1 ml-3 text-[10px] font-headline uppercase tracking-wider text-emerald-400">
        <Check className="w-3 h-3" />
        Flagged — thanks
      </div>
    );
  }

  return (
    <div className="ml-3 mt-1">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 text-[10px] font-headline uppercase tracking-wider text-outline/50 hover:text-error/70 transition-colors"
        >
          <Flag className="w-3 h-3" />
          Flag error
        </button>
      ) : (
        <div className="bg-surface-container border border-outline-variant/30 rounded-lg p-3 space-y-3 max-w-xs">
          <div className="flex items-center justify-between">
            <span className="font-headline text-[10px] uppercase tracking-wider text-outline">
              What was wrong?
            </span>
            <button onClick={() => setOpen(false)} className="text-outline/50 hover:text-on-surface">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Category picker */}
          <div className="grid grid-cols-2 gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`text-[10px] font-headline uppercase tracking-wider px-2 py-1.5 rounded-md border transition-all ${
                  category === c.key
                    ? "border-error/60 bg-error/10 text-error"
                    : "border-outline-variant/30 text-outline hover:border-outline hover:text-on-surface"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Optional correction text */}
          {category && (
            <input
              type="text"
              value={correction}
              onChange={(e) => setCorrection(e.target.value)}
              placeholder="What's the correct answer? (optional)"
              className="w-full bg-[#0e0e0e] border border-outline-variant/30 rounded-md px-2.5 py-2 text-[11px] font-body text-on-surface placeholder:text-outline/40 focus:outline-none focus:border-primary-container/50"
            />
          )}

          <button
            onClick={handleSubmit}
            disabled={!category || saving}
            className="w-full py-2 rounded-md bg-error/20 border border-error/30 text-error font-headline text-[10px] uppercase tracking-wider hover:bg-error/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Submit Flag"}
          </button>
        </div>
      )}
    </div>
  );
}
