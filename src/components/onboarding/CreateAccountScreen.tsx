"use client";

import { useState } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

interface AccountData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  companyName: string;
}

interface CreateAccountScreenProps {
  data: AccountData;
  onChange: (data: AccountData) => void;
  onContinue: () => void;
  onBack: () => void;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function CreateAccountScreen({
  data,
  onChange,
  onContinue,
  onBack,
}: CreateAccountScreenProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const update = (field: keyof AccountData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const emailValid = !data.email || validateEmail(data.email);
  const passwordValid = data.password.length >= 8;
  const passwordsMatch = data.password === data.confirmPassword;

  const isValid =
    data.firstName.trim() !== "" &&
    data.lastName.trim() !== "" &&
    validateEmail(data.email) &&
    passwordValid &&
    passwordsMatch &&
    data.confirmPassword !== "";

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
      {/* Back button */}
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
        className="text-xl tracking-wider font-bold uppercase mb-2"
        style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--on-surface)" }}
      >
        CREATE YOUR ACCOUNT
      </h1>
      <p
        className="text-sm mb-8"
        style={{ fontFamily: "Inter, sans-serif", color: "var(--outline)" }}
      >
        Takes 60 seconds. No credit card required.
      </p>

      {/* Form */}
      <div className="flex flex-col gap-4 w-full max-w-sm">
        {/* First Name */}
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5 font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--outline)" }}>
            First Name
          </label>
          <input
            type="text"
            value={data.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            onBlur={() => markTouched("firstName")}
            className={`w-full h-12 px-4 rounded-lg border text-sm ${focusClass}`}
            style={inputStyle}
            placeholder="John"
          />
        </div>

        {/* Last Name */}
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5 font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--outline)" }}>
            Last Name
          </label>
          <input
            type="text"
            value={data.lastName}
            onChange={(e) => update("lastName", e.target.value)}
            onBlur={() => markTouched("lastName")}
            className={`w-full h-12 px-4 rounded-lg border text-sm ${focusClass}`}
            style={inputStyle}
            placeholder="Smith"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5 font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--outline)" }}>
            Email
          </label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => update("email", e.target.value)}
            onBlur={() => markTouched("email")}
            className={`w-full h-12 px-4 rounded-lg border text-sm ${focusClass}`}
            style={{
              ...inputStyle,
              borderColor:
                touched.email && !emailValid
                  ? "#ef5350"
                  : inputStyle.borderColor,
            }}
            placeholder="john@company.com"
          />
          {touched.email && !emailValid && data.email && (
            <p className="text-xs mt-1" style={{ color: "#ef5350" }}>
              Please enter a valid email address
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5 font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--outline)" }}>
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={data.password}
              onChange={(e) => update("password", e.target.value)}
              onBlur={() => markTouched("password")}
              className={`w-full h-12 px-4 pr-12 rounded-lg border text-sm ${focusClass}`}
              style={{
                ...inputStyle,
                borderColor:
                  touched.password && !passwordValid
                    ? "#ef5350"
                    : inputStyle.borderColor,
              }}
              placeholder="Min 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--outline)" }}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          {touched.password && !passwordValid && data.password && (
            <p className="text-xs mt-1" style={{ color: "#ef5350" }}>
              Password must be at least 8 characters
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5 font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--outline)" }}>
            Confirm Password
          </label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              value={data.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              onBlur={() => markTouched("confirmPassword")}
              className={`w-full h-12 px-4 pr-12 rounded-lg border text-sm ${focusClass}`}
              style={{
                ...inputStyle,
                borderColor:
                  touched.confirmPassword &&
                  !passwordsMatch &&
                  data.confirmPassword
                    ? "#ef5350"
                    : inputStyle.borderColor,
              }}
              placeholder="Re-enter password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--outline)" }}
            >
              {showConfirm ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          {touched.confirmPassword && !passwordsMatch && data.confirmPassword && (
            <p className="text-xs mt-1" style={{ color: "#ef5350" }}>
              Passwords do not match
            </p>
          )}
        </div>

        {/* Company Name (optional) */}
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5 font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--outline)" }}>
            Company Name <span style={{ color: "var(--outline)" }}>(optional)</span>
          </label>
          <input
            type="text"
            value={data.companyName}
            onChange={(e) => update("companyName", e.target.value)}
            className={`w-full h-12 px-4 rounded-lg border text-sm ${focusClass}`}
            style={inputStyle}
            placeholder="ACME HVAC Services"
          />
        </div>
      </div>

      {/* Continue button */}
      <button
        onClick={onContinue}
        disabled={!isValid}
        className="w-full max-w-sm h-12 rounded-lg text-sm font-bold uppercase tracking-wider mt-8 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98]"
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          backgroundColor: isValid ? "var(--primary-accent)" : "var(--surface-container-high)",
          color: isValid ? "#0e0e0e" : "var(--outline)",
        }}
      >
        CONTINUE
      </button>

      {/* E-SIGN disclosure */}
      <p
        className="text-xs mt-4 max-w-sm leading-relaxed"
        style={{ color: "var(--outline)", fontFamily: "Inter, sans-serif" }}
      >
        By creating an account, you consent to receive electronic communications from Senior Tech.
        You may withdraw consent at any time in your account settings. This constitutes your E-SIGN
        Act consent.
      </p>
    </div>
  );
}
