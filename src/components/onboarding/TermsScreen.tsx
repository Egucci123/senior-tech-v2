"use client";

import { useState } from "react";
import { ArrowLeft, Check, X } from "lucide-react";

const CHECKBOX_ITEMS = [
  "I understand Senior Tech is an AI diagnostic assistant and does not replace professional judgment.",
  "I confirm I hold a valid EPA 608 certification for refrigerant handling.",
  "I acknowledge all electrical work must comply with NEC and local codes.",
  "I will not rely solely on AI recommendations for life-safety decisions.",
  "I accept responsibility for verifying all diagnostic suggestions before acting.",
  "I understand my diagnostic sessions may be reviewed to improve the service.",
  "I agree to the Terms of Service and Privacy Policy.",
  "I consent to receive electronic communications regarding my account.",
];

const TERMS_PREVIEW = `Senior Tech HVAC Diagnostic Assistant — Terms of Service

Last updated: March 2026

1. ACCEPTANCE OF TERMS
By creating an account and using the Senior Tech application ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to all terms, do not use the Service.

2. SERVICE DESCRIPTION
Senior Tech is an AI-powered diagnostic assistant designed to support licensed HVAC professionals. The Service provides diagnostic suggestions, technical reference information, and gauge-reading assistance. The Service does not replace professional certification, training, or field experience.

3. ELIGIBILITY
You must hold a valid EPA Section 608 certification to use this Service. You represent and warrant that all credentials provided during registration are accurate and current.

4. LIMITATION OF LIABILITY
Senior Tech and its operators shall not be liable for any damages arising from reliance on AI-generated diagnostic suggestions. All recommendations must be independently verified by a qualified technician before implementation.`;

interface TermsScreenProps {
  checkedItems: boolean[];
  onToggle: (index: number) => void;
  onSelectAll: () => void;
  onContinue: () => void;
  onBack: () => void;
}

export default function TermsScreen({
  checkedItems,
  onToggle,
  onSelectAll,
  onContinue,
  onBack,
}: TermsScreenProps) {
  const [showModal, setShowModal] = useState(false);

  const allChecked = checkedItems.every(Boolean);

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

      {/* Header row */}
      <div className="flex items-center justify-between mb-6 max-w-sm w-full">
        <h1
          className="text-xl tracking-wider font-bold uppercase"
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            color: "var(--on-surface)",
          }}
        >
          TERMS & CONDITIONS
        </h1>
        <button
          onClick={onSelectAll}
          className="text-xs uppercase tracking-wider font-semibold transition-opacity hover:opacity-80"
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            color: "var(--primary-accent)",
          }}
        >
          SELECT ALL
        </button>
      </div>

      {/* Terms Preview */}
      <div
        className="w-full max-w-sm rounded-lg p-4 mb-4 max-h-40 overflow-y-auto"
        style={{
          backgroundColor: "var(--surface-container)",
          border: "1px solid var(--outline-variant, #3e484f)",
        }}
      >
        <pre
          className="text-xs leading-relaxed whitespace-pre-wrap"
          style={{
            color: "var(--outline)",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {TERMS_PREVIEW}
        </pre>
      </div>

      {/* Read Full Terms */}
      <button
        onClick={() => setShowModal(true)}
        className="text-xs uppercase tracking-wider font-semibold mb-6 self-start transition-opacity hover:opacity-80"
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          color: "var(--primary-accent)",
        }}
      >
        READ FULL TERMS
      </button>

      {/* Checkboxes */}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        {CHECKBOX_ITEMS.map((text, index) => (
          <button
            key={index}
            onClick={() => onToggle(index)}
            className="flex items-start gap-3 text-left min-h-[48px] py-2 transition-colors"
          >
            <div
              className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center mt-0.5 transition-all duration-150"
              style={{
                backgroundColor: checkedItems[index]
                  ? "var(--primary-accent)"
                  : "transparent",
                border: checkedItems[index]
                  ? "2px solid var(--primary-accent)"
                  : "2px solid var(--outline-variant, #3e484f)",
              }}
            >
              {checkedItems[index] && (
                <Check className="w-4 h-4" style={{ color: "#0e0e0e" }} />
              )}
            </div>
            <span
              className="text-xs leading-relaxed"
              style={{
                fontFamily: "Inter, sans-serif",
                color: checkedItems[index]
                  ? "var(--on-surface)"
                  : "var(--outline)",
              }}
            >
              {text}
            </span>
          </button>
        ))}
      </div>

      {/* Create Account Button */}
      <button
        onClick={onContinue}
        disabled={!allChecked}
        className={`w-full max-w-sm h-12 rounded-lg text-sm font-bold uppercase tracking-wider mt-8 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98] ${
          allChecked ? "animate-subtle-pulse" : ""
        }`}
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          backgroundColor: allChecked
            ? "var(--primary-accent)"
            : "var(--surface-container-high)",
          color: allChecked ? "#0e0e0e" : "var(--outline)",
        }}
      >
        CREATE MY ACCOUNT
      </button>

      {/* Full Terms Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.8)" }}
            onClick={() => setShowModal(false)}
          />
          <div
            className="relative w-full max-w-lg max-h-[80vh] rounded-lg p-6 overflow-y-auto z-10"
            style={{
              backgroundColor: "var(--surface-container)",
              border: "1px solid var(--outline-variant, #3e484f)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-lg tracking-wider font-bold uppercase"
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  color: "var(--on-surface)",
                }}
              >
                FULL TERMS OF SERVICE
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="transition-opacity hover:opacity-80"
                style={{ color: "var(--outline)" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <pre
              className="text-xs leading-relaxed whitespace-pre-wrap"
              style={{
                color: "var(--on-surface)",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {TERMS_PREVIEW}
              {`

5. USER RESPONSIBILITIES
You are solely responsible for:
- Verifying all AI-generated diagnostic suggestions before implementation
- Ensuring compliance with all applicable codes and regulations
- Maintaining valid certifications and licenses
- Proper handling of refrigerants per EPA regulations
- Following all manufacturer safety guidelines

6. DATA COLLECTION AND PRIVACY
We collect diagnostic session data, gauge readings, and usage patterns to improve our AI models. Personal identification information is handled per our Privacy Policy. Session data may be anonymized and used for service improvement.

7. ELECTRONIC COMMUNICATIONS
By creating an account, you consent to receive electronic communications from Senior Tech regarding your account, service updates, and diagnostic features. You may opt out of non-essential communications at any time.

8. INTELLECTUAL PROPERTY
All AI models, diagnostic algorithms, and interface designs are proprietary to Senior Tech. Users retain ownership of their diagnostic session data.

9. TERMINATION
We reserve the right to suspend or terminate accounts that violate these Terms or misrepresent professional credentials.

10. GOVERNING LAW
These Terms shall be governed by the laws of the State of Texas, without regard to conflict of law provisions.`}
            </pre>
          </div>
        </div>
      )}

      {/* Pulse animation style */}
      <style jsx>{`
        @keyframes subtle-pulse {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(79, 195, 247, 0.4);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(79, 195, 247, 0);
          }
        }
        .animate-subtle-pulse {
          animation: subtle-pulse 2s infinite;
        }
      `}</style>
    </div>
  );
}
