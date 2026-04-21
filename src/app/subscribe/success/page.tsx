"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

type Stage = "verifying" | "activating" | "done" | "error";

export default function SubscribeSuccessPage() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const sessionId   = searchParams.get("session_id");

  const [stage, setStage]   = useState<Stage>("verifying");
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      router.replace("/subscribe");
      return;
    }

    let cancelled = false;

    async function verify() {
      try {
        setStage("activating");
        const res = await fetch(`/api/stripe/verify-session?session_id=${sessionId}`);
        const data = await res.json();

        if (!res.ok) {
          if (data.error === "payment_not_complete" && attempts < 4) {
            // Stripe occasionally hasn't processed yet — retry up to 4x
            if (!cancelled) {
              setAttempts((n) => n + 1);
              setTimeout(verify, 1500);
            }
            return;
          }
          throw new Error(data.error ?? "Verification failed");
        }

        if (!cancelled) {
          setStage("done");
          // Brief success flash, then redirect into app
          setTimeout(() => router.replace("/"), 1800);
        }
      } catch (err) {
        console.error("[subscribe/success]", err);
        if (!cancelled) setStage("error");
      }
    }

    verify();
    return () => { cancelled = true; };
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="min-h-screen dot-grid flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="flex flex-col items-center gap-5 text-center max-w-xs">
        {stage === "error" ? (
          <>
            <p
              className="text-sm"
              style={{ fontFamily: "Inter, sans-serif", color: "#ef4444" }}
            >
              We couldn't verify your payment. Don't worry — if your card was charged,
              your account will activate within a few minutes.
            </p>
            <button
              onClick={() => router.replace("/")}
              className="text-xs uppercase tracking-wider underline"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--outline)" }}
            >
              Try opening the app
            </button>
          </>
        ) : stage === "done" ? (
          <>
            <CheckCircle2 className="w-12 h-12 text-[#4fc3f7]" />
            <p
              className="text-lg font-bold uppercase tracking-wider"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--on-surface)" }}
            >
              YOU&apos;RE IN
            </p>
            <p
              className="text-xs text-outline"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Opening Senior Tech...
            </p>
          </>
        ) : (
          <>
            <Loader2 className="w-8 h-8 text-primary-container animate-spin" />
            <p
              className="text-xs uppercase tracking-widest text-outline"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              {stage === "verifying" ? "VERIFYING PAYMENT..." : "ACTIVATING ACCOUNT..."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
