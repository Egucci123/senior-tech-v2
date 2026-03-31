"use client";

import { AlertTriangle } from "lucide-react";

interface VerificationBannerProps {
  onResendEmail: () => void;
}

export default function VerificationBanner({
  onResendEmail,
}: VerificationBannerProps) {
  return (
    <div
      className="w-full px-4 py-3 flex items-center justify-between gap-3"
      style={{
        backgroundColor: "rgba(255, 183, 77, 0.1)",
        borderBottom: "1px solid rgba(255, 183, 77, 0.25)",
      }}
    >
      <div className="flex items-center gap-3">
        <AlertTriangle
          className="w-4 h-4 flex-shrink-0"
          style={{ color: "#ffb74d" }}
        />
        <p
          className="text-xs"
          style={{
            fontFamily: "Inter, sans-serif",
            color: "#ffb74d",
          }}
        >
          Please verify your email to unlock full access
        </p>
      </div>
      <button
        onClick={onResendEmail}
        className="text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-opacity hover:opacity-80"
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          color: "#ffb74d",
        }}
      >
        Resend Email
      </button>
    </div>
  );
}
