"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ValueScreen from "@/components/onboarding/ValueScreen";
import CreateAccountScreen from "@/components/onboarding/CreateAccountScreen";
import CredentialsScreen from "@/components/onboarding/CredentialsScreen";
import { mapYearsToLevel } from "@/components/onboarding/CredentialsScreen";
import TermsScreen from "@/components/onboarding/TermsScreen";
import type { ExperienceLevel } from "@/types";

const STORAGE_KEY = "seniortech_onboarding";
const TOTAL_SCREENS = 6;

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
  termsChecked: boolean[];
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
  termsChecked: new Array(8).fill(false),
  completed: false,
};

function loadState(): OnboardingState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Ensure termsChecked array is correct length
      if (!parsed.termsChecked || parsed.termsChecked.length !== 8) {
        parsed.termsChecked = new Array(8).fill(false);
      }
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
    setState((prev) => ({ ...prev, currentScreen: screen }));
    window.scrollTo(0, 0);
  }, []);

  const experienceLevel: ExperienceLevel =
    state.credentials.yearsInTrade
      ? mapYearsToLevel(state.credentials.yearsInTrade as "1-3" | "4-7" | "8-12" | "13-19" | "20+")
      : "mid";

  // Don't render until client state is loaded to avoid hydration mismatch
  if (!mounted) {
    return (
      <div
        className="min-h-screen dot-grid"
        style={{ backgroundColor: "var(--background)" }}
      />
    );
  }

  // If completed, redirect to main app
  if (state.completed && state.currentScreen !== 5) {
    // Already onboarded, go to main app
    if (typeof window !== "undefined") {
      localStorage.setItem("senior_tech_onboarding_complete", "true");
      router.replace("/");
    }
    return <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }} />;
  }

  return (
    <div
      className="min-h-screen relative"
      style={{ backgroundColor: "var(--background)" }}
    >
      {/* Progress Bar — hidden on screen 0 (value prop) */}
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
          onSignIn={() => {
            // TODO: Navigate to sign in
          }}
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
          checkedItems={state.termsChecked}
          onToggle={(index) => {
            setState((prev) => {
              const newChecked = [...prev.termsChecked];
              newChecked[index] = !newChecked[index];
              return { ...prev, termsChecked: newChecked };
            });
          }}
          onSelectAll={() => {
            setState((prev) => ({
              ...prev,
              termsChecked: new Array(8).fill(true),
            }));
          }}
          onContinue={() => {
            const userData = {
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
            localStorage.setItem("senior_tech_onboarding_complete", "true");
            localStorage.setItem("senior_tech_first_name", state.account.firstName);
            localStorage.setItem("senior_tech_experience_level", experienceLevel);
            localStorage.setItem("senior_tech_user", JSON.stringify(userData));
            setState((prev) => ({ ...prev, completed: true }));
            router.push("/");
          }}
          onBack={() => goTo(2)}
        />
      )}
    </div>
  );
}
