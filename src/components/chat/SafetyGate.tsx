"use client";

import { useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";

interface SafetyGateProps {
  isOpen: boolean;
  onConfirm: () => void;
}

const CHECKS = [
  "Lockout/tagout applied or intentionally bypassed",
  "PPE in place",
  "Area is clear",
] as const;

export default function SafetyGate({ isOpen, onConfirm }: SafetyGateProps) {
  const [checked, setChecked] = useState<boolean[]>([false, false, false]);

  const allChecked = checked.every(Boolean);

  function toggle(index: number) {
    setChecked((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }

  function handleConfirm() {
    if (!allChecked) return;
    setChecked([false, false, false]);
    onConfirm();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[12px]" />

      {/* Modal */}
      <div className="relative bg-surface-container rounded-lg max-w-sm w-full p-6 border border-outline-variant/30">
        {/* Warning icon */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-amber-500/15 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-amber-400" />
          </div>
        </div>

        {/* Header */}
        <h2 className="font-headline font-bold text-lg uppercase text-amber-400 text-center tracking-wide mb-1">
          LIVE VOLTAGE STEP
        </h2>
        <p className="font-body text-sm text-outline text-center mb-6">
          Confirm before proceeding:
        </p>

        {/* Checkboxes */}
        <div className="space-y-3 mb-6">
          {CHECKS.map((label, i) => (
            <label
              key={i}
              className="flex items-center gap-3 cursor-pointer min-h-[48px] px-3 py-2
                         rounded-lg hover:bg-white/5 transition-colors"
            >
              <div
                className={`w-6 h-6 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                  checked[i]
                    ? "bg-primary-container border-primary-container"
                    : "border-outline-variant bg-transparent"
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  toggle(i);
                }}
              >
                {checked[i] && (
                  <ShieldCheck className="w-4 h-4 text-on-primary" />
                )}
              </div>
              <input
                type="checkbox"
                checked={checked[i]}
                onChange={() => toggle(i)}
                className="sr-only"
              />
              <span className="font-body text-sm text-on-surface">{label}</span>
            </label>
          ))}
        </div>

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          disabled={!allChecked}
          className={`w-full py-3 rounded-lg font-headline font-bold text-sm uppercase tracking-wider
                      transition-all duration-200 ${
                        allChecked
                          ? "bg-primary-container text-on-primary-container hover:brightness-110 active:scale-[0.98]"
                          : "bg-surface-container-high text-outline cursor-not-allowed"
                      }`}
        >
          I CONFIRM &mdash; SHOW GUIDANCE
        </button>
      </div>
    </div>
  );
}
