"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ValueScreen from "@/components/onboarding/ValueScreen";
import CreateAccountScreen from "@/components/onboarding/CreateAccountScreen";
import CredentialsScreen from "@/components/onboarding/CredentialsScreen";
import { mapYearsToLevel } from "@/components/onboarding/CredentialsScreen";
import TermsScreen from "@/components/onboarding/TermsScreen";
import { supabase, signUp, signIn, createUserProfile, createAcknowledgments } from "@/lib/supabase";
import type { ExperienceLevel } from "@/types";

const STORAGE_KEY = "seniortech_onboarding";
const TOTAL_SCREENS = 6;

const ACKNOWLEDGMENT_TYPES = [
  "professional_certification",
  "assumption_of_risk",
  "ai_limitations",
  "professional_responsibility",
  "electrical_safety",
  "refrigerant_compliance",
  "no_account_sharing",
  "full_terms_agreement",
] as const;

interface OnboardingState {
  currentScreen: number;
  account: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    companyName: string;
  };
  credentials: {
    epa608: string;
    stateLicense: string;
    yearsInTrade: "" | "1-3" | "4-7" | "8-12" | "13-19" | "20+";
    primaryFocus: string[];
  };
  completed: boolean;
}

const DEFAULT_STATE: OnboardingState = {
  currentScreen: 0,
  account: {
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
  },
  credentials: {
    epa608: "",
    stateLicense: "",
    yearsInTrade: "",
    primaryFocus: [],
  },
  completed: false,
};

function loadState(): OnboardingState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_STATE, ...parsed };
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_STATE;
}

function saveState(state: OnboardingState) {
  if (typeof window === "undefined") return;
  try {
    // Don't persist passwords
    const toSave = {
      ...state,
      account: {
        ...state.account,
        password: "",
        confirmPassword: "",
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // Ignore storage errors
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const [state, setState] = useState<OnboardingState>(DEFAULT_STATE);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  // If already signed in, go straight to the app
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/");
    });
  }, [router]);

  // Load saved state on mount
  useEffect(() => {
    setState(loadState());
    setMounted(true);
  }, []);

  // Persist state on change (after mount)
  useEffect(() => {
    if (mounted) {
      saveState(state);
    }
  }, [state, mounted]);

  const goTo = useCallback((screen: number) => {
    setError(null);
    setState((prev) => ({ ...prev, currentScreen: screen }));
    window.scrollTo(0, 0);
  }, []);

  const experienceLevel: ExperienceLevel =
    state.credentials.yearsInTrade
      ? mapYearsToLevel(state.credentials.yearsInTrade as "1-3" | "4-7" | "8-12" | "13-19" | "20+")
      : "mid";

  const handleSignUp = async () => {
    setError(null);
    setSubmitting(true);

    try {
      // 1. Sign up with Supabase Auth
      const { data: authData, error: authError } = await signUp(
        state.account.email,
        state.account.password
      );

      if (authError) {
        if (authError.message?.toLowerCase().includes("already registered") ||
            authError.message?.toLowerCase().includes("already been registered")) {
          setError("This email is already registered. Please sign in instead.");
        } else {
          setError(authError.message || "Sign up failed. Please try again.");
        }
        setSubmitting(false);
        return;
      }

      const authUser = authData?.user;
      if (!authUser) {
        setError("Sign up failed. No user returned. Please try again.");
        setSubmitting(false);
        return;
      }

      // 1b. Sign in immediately to establish session before profile insert
      const { error: signInError } = await signIn(state.account.email, state.account.password);
      if (signInError) {
        setError(signInError.message || "Sign in after signup failed. Please try signing in manually.");
        setSubmitting(false);
        return;
      }

      // 2. Create user profile
      const profileData = {
        first_name: state.account.firstName,
        last_name: state.account.lastName,
        email: state.account.email,
        company_name: state.account.companyName,
        experience_level: experienceLevel,
        years_experience_range: state.credentials.yearsInTrade,
        epa_608_number: state.credentials.epa608,
        state_license_number: state.credentials.stateLicense,
        trade_focus: state.credentials.primaryFocus,
      };

      const { data: profileResult, error: profileError } = await createUserProfile(authUser.id, profileData);
      if (profileError) {
        setError(profileError.message || "Failed to create profile. Please try again.");
        setSubmitting(false);
        return;
      }

      // 3. Create acknowledgments (use users table id, not auth id)
      const profileId = profileResult?.id || authUser.id;
      const { error: ackError } = await createAcknowledgments(
        profileId,
        [...ACKNOWLEDGMENT_TYPES],
        "1.0.0",
        "1.2"
      );
      if (ackError) {
        setError(ackError.message || "Failed to save acknowledgments. Please try again.");
        setSubmitting(false);
        return;
      }

      // 4. Mark completed and navigate
      setState((prev) => ({ ...prev, completed: true }));
      router.push("/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
      setSubmitting(false);
    }
  };

  const handleSignIn = async () => {
    setSignInError(null);
    setSigningIn(true);

    try {
      const { error: authError } = await signIn(signInEmail, signInPassword);

      if (authError) {
        if (authError.message?.toLowerCase().includes("invalid") ||
            authError.message?.toLowerCase().includes("credentials")) {
          setSignInError("Invalid email or password. Please try again.");
        } else {
          setSignInError(authError.message || "Sign in failed. Please try again.");
        }
        setSigningIn(false);
        return;
      }

      // Clear onboarding localStorage on successful sign in
      localStorage.removeItem(STORAGE_KEY);
      router.push("/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setSignInError(message);
      setSigningIn(false);
    }
  };

  // Don't render until client state is loaded to avoid hydration mismatch
  if (!mounted) {
    return (
      <div
        className="min-h-screen dot-grid"
        style={{ backgroundColor: "var(--background)" }}
      />
    );
  }

  // Sign-in modal overlay
  if (showSignIn) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6 dot-grid"
        style={{ backgroundColor: "var(--background)" }}
      >
        <div
          className="w-full max-w-sm rounded-2xl p-6"
          style={{ backgroundColor: "var(--surface-container)" }}
        >
          <h2
            className="text-xl font-bold uppercase tracking-wider mb-6 text-center"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              color: "var(--on-surface)",
            }}
          >
            Sign In
          </h2>

          {signInError && (
            <div
              className="mb-4 p-3 rounded-lg text-sm"
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                color: "#ef4444",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {signInError}
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div>
              <label
                className="block text-xs uppercase tracking-wider mb-1.5"
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  color: "var(--outline)",
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={signInEmail}
                onChange={(e) => setSignInEmail(e.target.value)}
                className="w-full h-11 px-3 rounded-lg text-sm outline-none transition-colors"
                style={{
                  fontFamily: "Inter, sans-serif",
                  backgroundColor: "var(--surface-container-high)",
                  color: "var(--on-surface)",
                  border: "1px solid var(--outline-variant)",
                }}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label
                className="block text-xs uppercase tracking-wider mb-1.5"
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  color: "var(--outline)",
                }}
              >
                Password
              </label>
              <input
                type="password"
                value={signInPassword}
                onChange={(e) => setSignInPassword(e.target.value)}
                className="w-full h-11 px-3 rounded-lg text-sm outline-none transition-colors"
                style={{
                  fontFamily: "Inter, sans-serif",
                  backgroundColor: "var(--surface-container-high)",
                  color: "var(--on-surface)",
                  border: "1px solid var(--outline-variant)",
                }}
                placeholder="Your password"
                autoComplete="current-password"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && signInEmail && signInPassword && !signingIn) {
                    handleSignIn();
                  }
                }}
              />
            </div>

            <button
              onClick={handleSignIn}
              disabled={signingIn || !signInEmail || !signInPassword}
              className="w-full h-12 rounded-lg text-sm font-bold uppercase tracking-wider transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                backgroundColor: "var(--primary-accent)",
                color: "#0e0e0e",
              }}
            >
              {signingIn ? "Signing In..." : "Sign In"}
            </button>

            <button
              onClick={() => {
                setShowSignIn(false);
                setSignInError(null);
                setSignInEmail("");
                setSignInPassword("");
              }}
              className="text-sm transition-opacity hover:opacity-80"
              style={{
                fontFamily: "Inter, sans-serif",
                color: "var(--outline)",
              }}
            >
              Back to Get Started
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative"
      style={{ backgroundColor: "var(--background)" }}
    >
      {/* Progress Bar -- hidden on screen 0 (value prop) */}
      {state.currentScreen > 0 && (
        <div
          className="fixed top-0 left-0 right-0 z-40 h-1"
          style={{ backgroundColor: "var(--surface-container)" }}
        >
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{
              width: `${(state.currentScreen / (TOTAL_SCREENS - 1)) * 100}%`,
              backgroundColor: "var(--primary-accent)",
            }}
          />
        </div>
      )}

      {/* Screen Content */}
      {state.currentScreen === 0 && (
        <ValueScreen
          onStart={() => goTo(1)}
          onSignIn={() => setShowSignIn(true)}
        />
      )}

      {state.currentScreen === 1 && (
        <CreateAccountScreen
          data={state.account}
          onChange={(account) => setState((prev) => ({ ...prev, account }))}
          onContinue={() => goTo(2)}
          onBack={() => goTo(0)}
        />
      )}

      {state.currentScreen === 2 && (
        <CredentialsScreen
          data={state.credentials}
          onChange={(credentials) =>
            setState((prev) => ({ ...prev, credentials }))
          }
          onContinue={() => goTo(3)}
          onBack={() => goTo(1)}
        />
      )}

      {state.currentScreen === 3 && (
        <TermsScreen
          error={error}
          onContinue={() => handleSignUp()}
          onBack={() => goTo(2)}
        />
      )}
    </div>
  );
}
