"use client";

import { useState } from "react";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import type { ExperienceLevel } from "@/types";

const YEARS_OPTIONS = ["1-3", "4-7", "8-12", "13-19", "20+"] as const;
type YearsRange = (typeof YEARS_OPTIONS)[number];

const FOCUS_OPTIONS = [
  "RESIDENTIAL",
  "COMMERCIAL",
  "INDUSTRIAL",
  "REFRIGERATION",
  "ALL",
] as const;
type FocusOption = (typeof FOCUS_OPTIONS)[number];

export function mapYearsToLevel(years: YearsRange): ExperienceLevel {
  switch (years) {
    case "1-3":
      return "junior";
    case "4-7":
      return "mid";
    case "8-12":
      return "senior";
    case "13-19":
      return "veteran";
    case "20+":
      return "master";
  }
}

interface CredentialsData {
  epa608: string;
  stateLicense: string;
  yearsInTrade: YearsRange | "";
  primaryFocus: string[];
}

interface CredentialsScreenProps {
  data: CredentialsData;
  onChange: (data: CredentialsData) => void;
  onContinue: () => void;
  onBack: () => void;
}

export default function CredentialsScreen({
  data,
  onChange,
  onContinue,
  onBack,
}: CredentialsScreenProps) {
  const update = <K extends keyof CredentialsData>(
    field: K,
    value: CredentialsData[K]
  ) => {
    onChange({ ...data, [field]: value });
  };

  const toggleFocus = (option: string) => {
    if (option === "ALL") {
      if (data.primaryFocus.includes("ALL")) {
        update("primaryFocus", []);
      } else {
        update("primaryFocus", ["ALL"]);
      }
      return;
    }

    const withoutAll = data.primaryFocus.filter((f) => f !== "ALL");
    if (withoutAll.includes(option)) {
      update(
        "primaryFocus",
        withoutAll.filter((f) => f !== option)
      );
    } else {
      update("primaryFocus", [...withoutAll, option]);
    }
  };

  const isValid = data.epa608.trim() !== "" && data.yearsInTrade !== "";

  const inputStyle: React.CSSProperties = {
    backgroundColor: "#0e0e0e",
    borderColor: "var(--outline-variant, #3e484f)",
    color: "var(--on-surface)",
    fontFamily: "Inter, sans-serif",
  };

  const focusClass =
    "focus:outline-none focus:ring-2 focus:ring-[#4fc3f7]/40 focus:border-[#4fc3f7]";

  return (
    <div className="flex flex-col min-h-screen px-6 py-8 dot-grid">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 mb-6 text-sm self-start transition-opacity hover:opacity-80"
        style={{ color: "var(--outline)" }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Header */}
      <h1
        className="text-xl tracking-wider font-bold uppercase mb-6"
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          color: "var(--on-surface)",
        }}
      >
        YOUR CREDENTIALS
      </h1>

      {/* Amber Warning Card */}
      <div
        className="flex items-start gap-3 p-4 rounded-lg mb-6"
        style={{
          backgroundColor: "rgba(255, 183, 77, 0.08)",
          border: "1px solid rgba(255, 183, 77, 0.3)",
        }}
      >
        <AlertTriangle
          className="w-5 h-5 flex-shrink-0 mt-0.5"
          style={{ color: "#ffb74d" }}
        />
        <p
          className="text-xs leading-relaxed"
          style={{ color: "#ffb74d", fontFamily: "Inter, sans-serif" }}
        >
          HVAC work involves high-voltage electrical systems and regulated
          refrigerants. Senior Tech provides diagnostic assistance only.
          Always follow local codes, manufacturer specifications, and EPA
          regulations. Never exceed your certification level.
        </p>
      </div>

      {/* Form */}
      <div className="flex flex-col gap-5 w-full max-w-sm">
        {/* EPA 608 */}
        <div>
          <label
            className="block text-xs uppercase tracking-wider mb-1.5 font-semibold"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              color: "var(--outline)",
            }}
          >
            EPA 608 Certification Number{" "}
            <span style={{ color: "#ef5350" }}>*</span>
          </label>
          <input
            type="text"
            value={data.epa608}
            onChange={(e) => update("epa608", e.target.value)}
            className={`w-full h-12 px-4 rounded-lg border text-sm ${focusClass}`}
            style={inputStyle}
            placeholder="Enter your EPA 608 number"
          />
        </div>

        {/* State License */}
        <div>
          <label
            className="block text-xs uppercase tracking-wider mb-1.5 font-semibold"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              color: "var(--outline)",
            }}
          >
            State License Number{" "}
            <span className="font-normal" style={{ color: "var(--outline)" }}>
              (optional)
            </span>
          </label>
          <input
            type="text"
            value={data.stateLicense}
            onChange={(e) => update("stateLicense", e.target.value)}
            className={`w-full h-12 px-4 rounded-lg border text-sm ${focusClass}`}
            style={inputStyle}
            placeholder="e.g. TX-12345"
          />
        </div>

        {/* Years in Trade */}
        <div>
          <label
            className="block text-xs uppercase tracking-wider mb-2 font-semibold"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              color: "var(--outline)",
            }}
          >
            Years in Trade <span style={{ color: "#ef5350" }}>*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {YEARS_OPTIONS.map((option) => {
              const selected = data.yearsInTrade === option;
              return (
                <button
                  key={option}
                  onClick={() => update("yearsInTrade", option)}
                  className="h-10 px-5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-150"
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    backgroundColor: selected
                      ? "var(--primary-accent)"
                      : "var(--surface-container)",
                    color: selected ? "#0e0e0e" : "var(--on-surface)",
                    border: selected
                      ? "1px solid var(--primary-accent)"
                      : "1px solid var(--outline-variant, #3e484f)",
                  }}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary Focus */}
        <div>
          <label
            className="block text-xs uppercase tracking-wider mb-2 font-semibold"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              color: "var(--outline)",
            }}
          >
            Primary Focus
          </label>
          <div className="flex flex-wrap gap-2">
            {FOCUS_OPTIONS.map((option) => {
              const selected = data.primaryFocus.includes(option);
              return (
                <button
                  key={option}
                  onClick={() => toggleFocus(option)}
                  className="h-10 px-5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-150"
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    backgroundColor: selected
                      ? "var(--primary-accent)"
                      : "var(--surface-container)",
                    color: selected ? "#0e0e0e" : "var(--on-surface)",
                    border: selected
                      ? "1px solid var(--primary-accent)"
                      : "1px solid var(--outline-variant, #3e484f)",
                  }}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <p
        className="text-xs mt-6 max-w-sm leading-relaxed"
        style={{ color: "var(--outline)", fontFamily: "Inter, sans-serif" }}
      >
        Your credentials are stored securely and used to calibrate diagnostic
        responses. Senior Tech does not verify certifications with issuing
        authorities.
      </p>

      {/* Continue button */}
      <button
        onClick={onContinue}
        disabled={!isValid}
        className="w-full max-w-sm h-12 rounded-lg text-sm font-bold uppercase tracking-wider mt-8 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98]"
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          backgroundColor: isValid
            ? "var(--primary-accent)"
            : "var(--surface-container-high)",
          color: isValid ? "#0e0e0e" : "var(--outline)",
        }}
      >
        CONTINUE
      </button>
    </div>
  );
}
