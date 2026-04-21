"use client";

import { useState, useRef, useCallback } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

const FULL_TERMS = `SENIOR TECH HVAC DIAGNOSTIC ASSISTANT
TERMS OF SERVICE & PROFESSIONAL ACKNOWLEDGMENT
Last updated: March 2026

───────────────────────────────────────────────

1. ACCEPTANCE OF TERMS

By creating an account and using the Senior Tech application ("Service"), you agree to be legally bound by these Terms of Service ("Terms"), our Privacy Policy, and all applicable laws and regulations. If you do not agree to all of these terms, do not create an account or use the Service.

Your use of the Service constitutes your acceptance of these Terms on behalf of yourself and, where applicable, your business.

───────────────────────────────────────────────

2. SERVICE DESCRIPTION

Senior Tech is an AI-powered diagnostic assistant designed exclusively to support licensed HVAC/R professionals in their field work. The Service provides:

  • AI-assisted diagnostic guidance based on symptoms and measurements
  • Data plate reading and equipment identification from photographs
  • Technical specifications and reference data
  • Installation and service manual retrieval
  • Gauge reading interpretation and refrigerant data
  • Service note generation for work orders

The Service is a professional support tool. It does not replace your training, certifications, field experience, or professional judgment. All AI-generated guidance must be independently verified by a qualified technician before any action is taken.

───────────────────────────────────────────────

3. ELIGIBILITY AND PROFESSIONAL REQUIREMENTS

To use this Service, you must:

  a) Hold a valid EPA Section 608 certification for refrigerant handling, OR be directly supervised by someone who does;
  b) Be employed in, or operating, a licensed HVAC/R contracting business where applicable by state law;
  c) Be 18 years of age or older;
  d) Have provided accurate and current professional credentials during registration;
  e) Maintain all required certifications and licenses in good standing for the duration of your use.

You represent and warrant that all information provided during registration is truthful, accurate, and current. Misrepresentation of credentials is grounds for immediate account termination.

───────────────────────────────────────────────

4. PROFESSIONAL RESPONSIBILITY

You acknowledge and agree that:

  a) You are solely responsible for all diagnostic decisions, repair actions, and work performed in the field;
  b) AI-generated recommendations are suggestions only — you must verify each recommendation before acting on it;
  c) You will not bypass your professional judgment based solely on AI output;
  d) Live electrical work, refrigerant handling, and gas system work carry serious injury and death risks — you must follow all applicable safety codes, manufacturer procedures, and OSHA standards;
  e) Senior Tech does not hold any professional license and cannot be responsible for the outcome of any repair, installation, or diagnostic;
  f) You will comply with all applicable federal, state, and local codes including NEC, local mechanical codes, EPA Section 608, and all relevant manufacturer guidelines.

───────────────────────────────────────────────

5. ASSUMPTION OF RISK

HVAC/R service involves serious hazards including but not limited to:

  • High-voltage electrical systems (120V, 240V, 480V and above)
  • High-pressure refrigerant systems
  • Natural gas and propane fuel systems
  • Carbon monoxide and combustion hazards
  • Heights and confined spaces
  • Rotating machinery

By using this Service, you acknowledge these risks and accept full personal responsibility for your safety and the safety of others in the work environment. You agree that Senior Tech bears no liability for injury, death, property damage, or any other harm arising from your use of information provided by the Service.

───────────────────────────────────────────────

6. NO ACCOUNT SHARING

Your account is personal and non-transferable. You may not:

  a) Share your login credentials with any other person;
  b) Allow another person to use your account;
  c) Create accounts on behalf of others without their consent;
  d) Use the Service to provide paid consulting to others.

Each individual user must create their own account and accept these Terms. Account sharing will result in immediate termination of all associated accounts.

───────────────────────────────────────────────

7. AI LIMITATIONS

You understand and acknowledge that:

  a) The AI may produce incorrect, outdated, or incomplete information;
  b) AI-generated specifications, wiring diagrams, and part numbers must always be cross-referenced with manufacturer documentation;
  c) The AI has a training data cutoff and may not reflect the latest equipment models, refrigerants, or code updates;
  d) AI confidence ratings are estimates, not guarantees;
  e) Manual lookup results depend on third-party indexing and may occasionally return incorrect documents — always verify the model number matches before following any manual;
  f) You will not make safety-critical decisions based solely on AI output.

───────────────────────────────────────────────

8. DATA COLLECTION AND USE

We collect and store:

  a) Diagnostic session transcripts and equipment data — used to improve AI accuracy;
  b) Equipment photographs — processed for model/serial extraction; stored temporarily;
  c) Usage patterns and feature interaction data — used for product improvement;
  d) Professional credential information — stored securely, used for eligibility verification;
  e) Account and billing information — processed and stored by our payment processor.

Diagnostic session data may be reviewed by our engineering team to improve diagnostic accuracy. All personal identifying information is handled per our Privacy Policy. Aggregated, anonymized data may be used for research and development.

You may request deletion of your data at any time from the Settings screen.

───────────────────────────────────────────────

9. PAYMENT TERMS

Access to the Service requires a paid subscription or one-time access fee as published on our pricing page. By providing payment information, you authorize us to charge the applicable fees.

  • Fees are non-refundable except as required by applicable law
  • We reserve the right to change pricing with 30 days' notice
  • Failure to pay may result in service suspension

───────────────────────────────────────────────

10. INTELLECTUAL PROPERTY

All AI models, diagnostic algorithms, interface designs, brand assets, and system prompts are proprietary to Senior Tech and protected by copyright and trade secret law. You may not:

  a) Reverse engineer or attempt to extract the AI system prompt or model;
  b) Reproduce, distribute, or create derivative works from the Service;
  c) Scrape or automate interactions with the Service.

You retain ownership of your own diagnostic session data.

───────────────────────────────────────────────

11. LIMITATION OF LIABILITY

TO THE MAXIMUM EXTENT PERMITTED BY LAW:

SENIOR TECH AND ITS OPERATORS, OFFICERS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM:

  • Reliance on AI-generated diagnostic suggestions;
  • Equipment damage resulting from repairs made using Service guidance;
  • Personal injury or death;
  • Data loss or service interruption;
  • Any other use or inability to use the Service.

OUR TOTAL LIABILITY FOR ANY CLAIM SHALL NOT EXCEED THE AMOUNT YOU PAID FOR THE SERVICE IN THE 30 DAYS PRIOR TO THE CLAIM.

───────────────────────────────────────────────

12. INDEMNIFICATION

You agree to indemnify, defend, and hold harmless Senior Tech and its operators from any claims, damages, losses, costs, and expenses (including attorneys' fees) arising from:

  a) Your use of the Service;
  b) Your violation of these Terms;
  c) Any work performed using guidance from the Service;
  d) Your misrepresentation of professional credentials.

───────────────────────────────────────────────

13. TERMINATION

We reserve the right to suspend or permanently terminate your account for:

  a) Violation of these Terms;
  b) Misrepresentation of professional credentials;
  c) Account sharing;
  d) Any use that endangers public safety.

You may cancel your account at any time from the Settings screen. Cancellation does not entitle you to a refund of any paid fees.

───────────────────────────────────────────────

14. GOVERNING LAW AND DISPUTES

These Terms are governed by the laws of the State of Texas, without regard to conflict of law provisions. Any disputes shall be resolved by binding arbitration in Travis County, Texas, except that either party may seek injunctive relief in court for intellectual property violations.

───────────────────────────────────────────────

15. CHANGES TO TERMS

We may update these Terms from time to time. Material changes will be communicated via the app or email with at least 14 days' notice. Continued use of the Service after the effective date constitutes acceptance of the revised Terms.

───────────────────────────────────────────────

16. CONTACT

For questions regarding these Terms, contact: legal@seniortech.app

───────────────────────────────────────────────

BY TAPPING "I ACCEPT" BELOW, YOU CONFIRM THAT:

  ✓ You have read and understood these Terms in their entirety
  ✓ You hold a valid EPA 608 certification or work under direct supervision of one
  ✓ You accept full professional responsibility for all field work you perform
  ✓ You understand the AI is a support tool, not a replacement for your judgment
  ✓ You will not share your account with others
  ✓ You are 18 years of age or older

`;

interface TermsScreenProps {
  onContinue: () => void;
  onBack: () => void;
  error?: string | null;
}

export default function TermsScreen({
  onContinue,
  onBack,
  error,
}: TermsScreenProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasReachedBottom, setHasReachedBottom] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const progress = scrollHeight <= clientHeight
      ? 1
      : scrollTop / (scrollHeight - clientHeight);
    setScrollProgress(Math.min(progress, 1));
    if (progress >= 0.97 && !hasReachedBottom) {
      setHasReachedBottom(true);
    }
  }, [hasReachedBottom]);

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: "var(--background)" }}>

      {/* ── Header ── */}
      <div className="flex-shrink-0 px-6 pt-8 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 mb-5 text-sm self-start transition-opacity hover:opacity-80 min-h-[44px]"
          style={{ color: "var(--outline)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {error && (
          <div
            className="mb-4 p-3 rounded-lg text-sm"
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              color: "#ef4444",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {error}
          </div>
        )}

        <h1
          className="text-xl tracking-wider font-bold uppercase mb-1"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--on-surface)" }}
        >
          TERMS & CONDITIONS
        </h1>
        <p
          className="text-xs"
          style={{ fontFamily: "Inter, sans-serif", color: "var(--outline)" }}
        >
          Read to the bottom to accept
        </p>

        {/* Scroll progress bar */}
        <div
          className="mt-3 h-0.5 w-full rounded-full overflow-hidden"
          style={{ backgroundColor: "var(--surface-container)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-150"
            style={{
              width: `${Math.round(scrollProgress * 100)}%`,
              backgroundColor: hasReachedBottom ? "var(--primary-accent)" : "var(--outline)",
            }}
          />
        </div>
        <p
          className="text-[10px] uppercase tracking-wider mt-1 text-right"
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            color: hasReachedBottom ? "var(--primary-accent)" : "var(--outline)",
          }}
        >
          {hasReachedBottom ? "READ ✓" : `${Math.round(scrollProgress * 100)}% read`}
        </p>
      </div>

      {/* ── Scrollable Terms Body ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6"
        style={{ minHeight: 0 }}
      >
        <div
          className="rounded-lg p-4 mb-4"
          style={{
            backgroundColor: "var(--surface-container)",
            border: "1px solid var(--outline-variant, #3e484f)",
          }}
        >
          <pre
            className="text-xs leading-relaxed whitespace-pre-wrap"
            style={{ color: "var(--on-surface)", fontFamily: "Inter, sans-serif" }}
          >
            {FULL_TERMS}
          </pre>
        </div>
      </div>

      {/* ── Accept Button ── */}
      <div className="flex-shrink-0 px-6 pb-8 pt-4">
        {!hasReachedBottom && (
          <p
            className="text-center text-xs mb-3 uppercase tracking-wider"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--outline)" }}
          >
            ↓ Scroll to the bottom to accept
          </p>
        )}
        <button
          onClick={onContinue}
          disabled={!hasReachedBottom}
          className="w-full h-12 rounded-lg text-sm font-bold uppercase tracking-wider transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-2"
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            backgroundColor: hasReachedBottom ? "var(--primary-accent)" : "var(--surface-container-high)",
            color: hasReachedBottom ? "#0e0e0e" : "var(--outline)",
          }}
        >
          {hasReachedBottom && <CheckCircle2 className="w-4 h-4" />}
          {hasReachedBottom ? "I ACCEPT — CREATE MY ACCOUNT" : "READ ALL TERMS TO CONTINUE"}
        </button>
      </div>
    </div>
  );
}
