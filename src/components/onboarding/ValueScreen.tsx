"use client";

import { Wrench, Gauge, Shield, Smartphone } from "lucide-react";

interface ValueScreenProps {
  onStart: () => void;
  onSignIn: () => void;
}

export default function ValueScreen({ onStart, onSignIn }: ValueScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 dot-grid">
      {/* Logo */}
      <div className="flex flex-col items-center mb-12">
        <div
          className="clip-hex flex items-center justify-center w-20 h-20 mb-4"
          style={{ backgroundColor: "var(--primary-accent)" }}
        >
          <Wrench className="w-10 h-10" style={{ color: "#0e0e0e" }} />
        </div>
        <h1
          className="text-2xl tracking-widest font-bold uppercase"
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            color: "var(--on-surface)",
          }}
        >
          SENIOR TECH
        </h1>
      </div>

      {/* Value Props */}
      <div className="flex flex-col gap-6 w-full max-w-sm mb-12">
        <ValueProp
          icon={<Shield className="w-6 h-6" style={{ color: "var(--primary-accent)" }} />}
          text="20 years field experience in your pocket"
        />
        <ValueProp
          icon={<Gauge className="w-6 h-6" style={{ color: "var(--primary-accent)" }} />}
          text="Snap your gauges — Senior Tech reads them instantly"
        />
        <ValueProp
          icon={<Smartphone className="w-6 h-6" style={{ color: "var(--primary-accent)" }} />}
          text="Built by a working HVAC tech, for HVAC techs"
        />
      </div>

      {/* CTA */}
      <button
        onClick={onStart}
        className="w-full max-w-sm h-12 rounded-lg text-sm font-bold uppercase tracking-wider transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          backgroundColor: "var(--primary-accent)",
          color: "#0e0e0e",
        }}
      >
        START FREE — 14 DAYS
      </button>

      {/* Sign In */}
      <button
        onClick={onSignIn}
        className="mt-4 text-sm transition-opacity hover:opacity-80"
        style={{
          fontFamily: "Inter, sans-serif",
          color: "var(--outline)",
        }}
      >
        Sign In
      </button>
    </div>
  );
}

function ValueProp({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-4">
      <div
        className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: "var(--surface-container)" }}
      >
        {icon}
      </div>
      <p
        className="text-sm leading-snug"
        style={{
          fontFamily: "Inter, sans-serif",
          color: "var(--on-surface)",
        }}
      >
        {text}
      </p>
    </div>
  );
}
