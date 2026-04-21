"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Wrench, Check, Zap, BookOpen, Clock, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const FEATURES = [
  { icon: Zap,      text: "Unlimited AI diagnostic sessions" },
  { icon: BookOpen, text: "Auto-load installation & service manuals" },
  { icon: Wrench,   text: "Photo data plate reading + spec lookup" },
  { icon: Clock,    text: "Full diagnostic session history" },
  { icon: Shield,   text: "Service notes generator for work orders" },
  { icon: Check,    text: "R-22, R-410A, R-32, R-454B coverage" },
];

function SubscribePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, session, loading } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const cancelled = searchParams.get("cancelled") === "1";

  // Already subscribed → go to app
  useEffect(() => {
    if (!loading && user?.subscription_status === "active") {
      router.replace("/");
    }
    // Not logged in → go to onboarding
    if (!loading && !session) {
      router.replace("/onboarding");
    }
  }, [loading, user, session, router]);

  const handleSubscribe = async () => {
    if (!user || !session) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === "already_subscribed") {
          router.replace("/");
          return;
        }
        throw new Error(data.error ?? "Failed to start checkout");
      }

      // Redirect to Stripe hosted checkout
      window.location.href = data.url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(msg);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen dot-grid flex items-center justify-center" style={{ backgroundColor: "var(--background)" }}>
        <div className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen dot-grid px-6 py-10 flex flex-col items-center" style={{ backgroundColor: "var(--background)" }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 clip-hex bg-surface-container-high flex items-center justify-center mb-4">
            <Wrench className="w-7 h-7 text-primary-container" />
          </div>
          <h1
            className="text-2xl font-bold uppercase tracking-wider text-on-surface"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            SENIOR TECH
          </h1>
          <p
            className="text-[10px] uppercase tracking-widest text-outline mt-0.5"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            HVAC DIAGNOSTIC AI
          </p>
        </div>

        {/* Cancelled notice */}
        {cancelled && (
          <div
            className="mb-5 p-3 rounded-lg text-xs text-center"
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.08)",
              color: "var(--outline)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Checkout was cancelled. Subscribe anytime to access the app.
          </div>
        )}

        {/* Pricing card */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{
            backgroundColor: "var(--surface-container)",
            border: "1px solid var(--outline-variant, #3e484f)",
          }}
        >
          {/* Price */}
          <div className="flex items-end gap-1 mb-1">
            <span
              className="text-4xl font-bold"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--primary-accent)" }}
            >
              $10
            </span>
            <span
              className="text-sm text-outline mb-1.5"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              / month
            </span>
          </div>
          <p
            className="text-[10px] uppercase tracking-widest text-outline mb-5"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Cancel anytime · No contracts
          </p>

          {/* Features */}
          <div className="flex flex-col gap-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "rgba(79,195,247,0.12)" }}
                >
                  <Icon className="w-3.5 h-3.5 text-primary-container" />
                </div>
                <span
                  className="text-xs text-on-surface"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="mb-4 p-3 rounded-lg text-sm text-center"
            style={{
              backgroundColor: "rgba(239,68,68,0.1)",
              color: "#ef4444",
              border: "1px solid rgba(239,68,68,0.3)",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {error}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleSubscribe}
          disabled={submitting}
          className="w-full h-12 rounded-xl font-bold uppercase tracking-wider text-sm
                     transition-all duration-200 hover:brightness-110 active:scale-[0.98]
                     disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            backgroundColor: "var(--primary-accent)",
            color: "#0e0e0e",
          }}
        >
          {submitting ? "LOADING..." : "SUBSCRIBE — $10/MO"}
        </button>

        <p
          className="text-center text-[10px] text-outline mt-4 leading-relaxed"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          Secured by Stripe. Cancel anytime from the Settings screen.
        </p>
      </div>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense>
      <SubscribePageInner />
    </Suspense>
  );
}
