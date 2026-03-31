"use client";

import { Shield, Wrench, Award, Star, Crown } from "lucide-react";
import type { ExperienceLevel } from "@/types";

interface BadgeConfig {
  label: string;
  subtitle: string;
  modeExplanation: string;
  openingMessage: string;
  icon: React.ReactNode;
  color: string;
}

const BADGE_MAP: Record<ExperienceLevel, BadgeConfig> = {
  junior: {
    label: "JUNIOR TECH",
    subtitle: "FULL GUIDANCE MODE",
    modeExplanation:
      "Senior Tech will walk you through each diagnostic step with detailed explanations, safety reminders, and reference values.",
    openingMessage:
      "Hey, welcome aboard. I'm Senior Tech — think of me as the lead tech riding along on every call. Tell me what you're looking at, and I'll walk you through it step by step. No question is too basic. What unit are you working on?",
    icon: <Shield className="w-10 h-10" />,
    color: "#66bb6a",
  },
  mid: {
    label: "MID-LEVEL TECH",
    subtitle: "STANDARD MODE",
    modeExplanation:
      "Senior Tech will provide diagnostic guidance with moderate detail, assuming solid fundamentals but offering context when helpful.",
    openingMessage:
      "Good to have you on the team. You know your way around a unit — I'll give you solid diagnostics without over-explaining the basics. What are you working on today?",
    icon: <Wrench className="w-10 h-10" />,
    color: "#4fc3f7",
  },
  senior: {
    label: "SENIOR TECH",
    subtitle: "PEER MODE",
    modeExplanation:
      "Senior Tech will communicate as a knowledgeable peer — concise, technical, focused on what matters.",
    openingMessage:
      "Tech to tech — let's figure this out. Give me the unit info and your readings, and I'll tell you what I see. What do you have?",
    icon: <Award className="w-10 h-10" />,
    color: "#ffa726",
  },
  veteran: {
    label: "VETERAN",
    subtitle: "DIRECT MODE",
    modeExplanation:
      "Senior Tech will be direct and efficient. No hand-holding — just the diagnosis and the data to back it up.",
    openingMessage:
      "You've seen it all. I'll keep it tight — give me your readings and I'll cut straight to the probable cause. Go ahead.",
    icon: <Star className="w-10 h-10" />,
    color: "#ef5350",
  },
  master: {
    label: "MASTER TECH",
    subtitle: "EXPERT MODE",
    modeExplanation:
      "Senior Tech operates as a reference tool. Quick confirmations, data lookups, and second opinions when you want them.",
    openingMessage:
      "Master Tech on the line. I'm here when you need a second set of eyes or a quick spec lookup. What do you need?",
    icon: <Crown className="w-10 h-10" />,
    color: "#ab47bc",
  },
};

interface CalibrationScreenProps {
  experienceLevel: ExperienceLevel;
  onStartDiagnosing: () => void;
}

export default function CalibrationScreen({
  experienceLevel,
  onStartDiagnosing,
}: CalibrationScreenProps) {
  const badge = BADGE_MAP[experienceLevel];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 dot-grid">
      {/* Experience Badge */}
      <div className="flex flex-col items-center mb-8">
        <div
          className="clip-hex flex items-center justify-center w-24 h-24 mb-4"
          style={{ backgroundColor: badge.color }}
        >
          <div style={{ color: "#0e0e0e" }}>{badge.icon}</div>
        </div>
        <h1
          className="text-2xl tracking-widest font-bold uppercase"
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            color: badge.color,
          }}
        >
          {badge.label}
        </h1>
        <p
          className="text-sm tracking-wider uppercase mt-1"
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            color: "var(--outline)",
          }}
        >
          {badge.subtitle}
        </p>
      </div>

      {/* Mode Explanation */}
      <p
        className="text-sm text-center max-w-sm leading-relaxed mb-8"
        style={{
          fontFamily: "Inter, sans-serif",
          color: "var(--on-surface)",
        }}
      >
        {badge.modeExplanation}
      </p>

      {/* Opening Message Preview */}
      <div
        className="w-full max-w-sm rounded-lg p-4 mb-10"
        style={{
          backgroundColor: "var(--surface-container)",
          border: "1px solid var(--outline-variant, #3e484f)",
        }}
      >
        <p
          className="text-xs uppercase tracking-wider font-semibold mb-2"
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            color: "var(--outline)",
          }}
        >
          YOUR FIRST MESSAGE FROM SENIOR TECH
        </p>
        <p
          className="text-sm leading-relaxed italic"
          style={{
            fontFamily: "Inter, sans-serif",
            color: "var(--on-surface)",
          }}
        >
          &ldquo;{badge.openingMessage}&rdquo;
        </p>
      </div>

      {/* CTA Buttons */}
      <button
        onClick={onStartDiagnosing}
        className="w-full max-w-sm h-12 rounded-lg text-sm font-bold uppercase tracking-wider transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          backgroundColor: "var(--primary-accent)",
          color: "#0e0e0e",
        }}
      >
        START DIAGNOSING
      </button>

    </div>
  );
}
