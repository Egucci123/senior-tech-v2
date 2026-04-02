'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Thermometer,
  Contrast,
  Globe,
  RefreshCw,
  Fingerprint,
  Trash2,
  Award,
  KeyRound,
  Mail,
  Lock,
  CreditCard,
  FileText,
  Shield,
  Info,
  LogOut,
  ChevronRight,
  Wrench,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase, updateUserProfile } from '@/lib/supabase';

/* ------------------------------------------------------------------ */
/*  Toggle                                                            */
/* ------------------------------------------------------------------ */
function Toggle({
  on,
  onToggle,
}: {
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="relative flex-shrink-0 h-[26px] w-[48px] rounded-full transition-colors duration-200"
      style={{ backgroundColor: on ? '#4fc3f7' : '#2a2a2a' }}
    >
      <span
        className="absolute top-[3px] left-[3px] h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
        style={{ transform: on ? 'translateX(22px)' : 'translateX(0)' }}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Section header                                                    */
/* ------------------------------------------------------------------ */
function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-4 pt-6 pb-2">
      <span className="w-2 h-2 rounded-full bg-tertiary flex-shrink-0" />
      <span className="font-headline font-bold text-[11px] uppercase tracking-widest text-outline">
        {label}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Setting row                                                       */
/* ------------------------------------------------------------------ */
interface SettingRowProps {
  icon: React.ElementType;
  label: string;
  sub?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}

function SettingRow({ icon: Icon, label, sub, right, onClick, danger }: SettingRowProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full px-4 py-3 text-left transition-colors active:bg-surface-container-high/40"
    >
      <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center flex-shrink-0">
        <Icon className={`w-[18px] h-[18px] ${danger ? 'text-error' : 'text-outline'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <span
          className={`font-headline font-bold text-sm uppercase tracking-wide block ${
            danger ? 'text-error' : 'text-on-surface'
          }`}
        >
          {label}
        </span>
        {sub && (
          <span className="font-body text-xs text-outline block mt-0.5 truncate">{sub}</span>
        )}
      </div>
      {right}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Divider                                                           */
/* ------------------------------------------------------------------ */
function Divider() {
  return <div className="h-px bg-outline-variant/30 mx-4" />;
}

/* ------------------------------------------------------------------ */
/*  Chevron shorthand                                                 */
/* ------------------------------------------------------------------ */
function NavChevron() {
  return <ChevronRight className="w-4 h-4 text-outline flex-shrink-0" />;
}

/* ------------------------------------------------------------------ */
/*  Change Password Modal                                             */
/* ------------------------------------------------------------------ */
function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) {
        setError(authError.message);
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Failed to update password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-surface-container-low rounded-lg p-6 w-full max-w-sm ghost-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-headline font-bold text-sm uppercase tracking-wide text-on-surface">
            Change Password
          </h3>
          <button onClick={onClose} className="text-outline hover:text-on-surface">
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div>
            <p className="font-body text-sm text-[#69cc69] mb-4">Password updated successfully.</p>
            <button
              onClick={onClose}
              className="w-full h-10 rounded-lg bg-primary-container font-headline font-bold text-xs uppercase tracking-wide text-[#0e0e0e]"
            >
              CLOSE
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 px-3 rounded-lg bg-surface-container border border-outline-variant text-sm text-on-surface placeholder:text-outline/50 focus:outline-none focus:border-primary-container"
            />
            <input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-10 px-3 rounded-lg bg-surface-container border border-outline-variant text-sm text-on-surface placeholder:text-outline/50 focus:outline-none focus:border-primary-container"
            />
            {error && (
              <p className="font-body text-xs text-error">{error}</p>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full h-10 rounded-lg bg-primary-container font-headline font-bold text-xs uppercase tracking-wide text-[#0e0e0e] disabled:opacity-50"
            >
              {submitting ? 'UPDATING...' : 'UPDATE PASSWORD'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ProfileScreen                                                     */
/* ------------------------------------------------------------------ */
export default function ProfileScreen() {
  const router = useRouter();
  const { session, user, loading, signOut } = useAuth();

  /* ---- local toggle / settings state ---- */
  const [highContrast, setHighContrast] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [biometric, setBiometric] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.push('/onboarding');
  }, [signOut, router]);

  const handleToggle = useCallback(
    (field: string, value: boolean) => {
      if (session?.user?.id) {
        updateUserProfile(session.user.id, { [field]: value })
          .then(() => {})
          .catch((e) => console.error('Failed to update user profile:', e));
      }
    },
    [session]
  );

  const handleClearCache = useCallback(() => {
    setClearingCache(true);
    try {
      // Clear diagnostic-related localStorage items
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('senior_tech_') || key.startsWith('diagnostic_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch {
      /* noop */
    }
    setTimeout(() => setClearingCache(false), 1000);
  }, []);

  if (loading) {
    return (
      <div className="px-4 pt-20 pb-24 max-w-lg mx-auto flex items-center justify-center min-h-[50vh]">
        <span className="font-headline font-bold text-xs uppercase tracking-widest text-outline animate-pulse">
          LOADING...
        </span>
      </div>
    );
  }

  // Not loading but no session — show sign-in prompt with sign-out option
  if (!session) {
    return (
      <div className="px-4 pt-20 pb-24 max-w-lg mx-auto flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <span className="font-headline font-bold text-xs uppercase tracking-widest text-outline">
          NOT SIGNED IN
        </span>
        <p className="font-body text-sm text-outline text-center">
          Sign in to view and manage your profile settings.
        </p>
        <button
          onClick={handleSignOut}
          className="mt-2 h-11 px-6 rounded-lg border border-error/40 font-headline font-bold text-sm uppercase tracking-wider text-error transition-colors active:bg-error/10 flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          GO TO SIGN IN
        </button>
      </div>
    );
  }

  const initials =
    ((user?.first_name?.[0] ?? '') + (user?.last_name?.[0] ?? '')).toUpperCase() || 'ST';
  const fullName =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ').toUpperCase() || 'TECHNICIAN';
  const company = user?.company_name?.toUpperCase() || 'INDEPENDENT';
  const yearsLabel = user?.years_experience_range
    ? `${user.years_experience_range} YRS EXPERIENCE`
    : user?.experience_level
    ? `${user.experience_level.toUpperCase()} LEVEL`
    : '0-2 YRS EXPERIENCE';

  return (
    <div className="px-0 pt-16 pb-28 max-w-lg mx-auto overflow-y-auto">
      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}

      {/* ============================================================ */}
      {/*  PROFILE CARD                                                */}
      {/* ============================================================ */}
      <div className="bg-surface-container-low ghost-border rounded-lg mx-4 mt-4 p-5 flex flex-col items-center">
        {/* Hex avatar */}
        <div
          className="clip-hex w-20 h-20 flex items-center justify-center text-xl font-headline font-bold tracking-wider"
          style={{ backgroundColor: '#4fc3f7', color: '#0e0e0e' }}
        >
          {initials}
        </div>

        {/* Name */}
        <h2 className="font-headline font-bold text-lg uppercase tracking-wide text-on-surface mt-3">
          {fullName}
        </h2>

        {/* Role / Company */}
        <p className="font-headline text-xs uppercase tracking-wider text-on-surface-variant mt-0.5">
          LEAD FIELD ENGINEER | {company}
        </p>

        {/* Experience badge */}
        <span
          className="inline-block mt-3 px-3 py-1 rounded-full text-[10px] font-headline font-bold uppercase tracking-wider"
          style={{ backgroundColor: '#4fc3f7', color: '#0e0e0e' }}
        >
          {yearsLabel}
        </span>
      </div>

      {/* ============================================================ */}
      {/*  ZONE_01: SYSTEM_PREFERENCES                                 */}
      {/* ============================================================ */}
      <SectionHeader label="ZONE_01: SYSTEM_PREFERENCES" />

      <div className="bg-surface-container-low ghost-border rounded-lg mx-4 overflow-hidden">
        <SettingRow
          icon={Thermometer}
          label="Temperature Unit"
          sub="CURRENT: CELSIUS (&deg;C)"
          right={<NavChevron />}
        />
        <Divider />
        <SettingRow
          icon={Contrast}
          label="High-Contrast Mode"
          right={
            <Toggle
              on={highContrast}
              onToggle={() => {
                setHighContrast((v) => {
                  handleToggle('high_contrast', !v);
                  return !v;
                });
              }}
            />
          }
        />
        <Divider />
        <SettingRow
          icon={Globe}
          label="Interface Language"
          sub="EN-US"
          right={<NavChevron />}
        />
      </div>

      {/* ============================================================ */}
      {/*  ZONE_02: SECURE_COMMS                                       */}
      {/* ============================================================ */}
      <SectionHeader label="ZONE_02: SECURE_COMMS" />

      <div className="bg-surface-container-low ghost-border rounded-lg mx-4 overflow-hidden">
        <SettingRow
          icon={RefreshCw}
          label="Auto-Sync Job Data"
          right={
            <Toggle
              on={autoSync}
              onToggle={() => {
                setAutoSync((v) => {
                  handleToggle('auto_sync', !v);
                  return !v;
                });
              }}
            />
          }
        />
        <Divider />
        <SettingRow
          icon={Fingerprint}
          label="Biometric Login"
          right={
            <Toggle
              on={biometric}
              onToggle={() => {
                setBiometric((v) => {
                  handleToggle('biometric_login', !v);
                  return !v;
                });
              }}
            />
          }
        />
        <Divider />
        <SettingRow
          icon={Trash2}
          label="Clear Diagnostic Cache"
          onClick={handleClearCache}
          right={
            <span className="font-headline font-bold text-xs uppercase tracking-wider text-primary-container">
              {clearingCache ? 'WIPED' : 'WIPE'}
            </span>
          }
        />
      </div>

      {/* ============================================================ */}
      {/*  ZONE_03: CREDENTIALS                                        */}
      {/* ============================================================ */}
      <SectionHeader label="ZONE_03: CREDENTIALS" />

      <div className="bg-surface-container-low ghost-border rounded-lg mx-4 overflow-hidden">
        <SettingRow
          icon={Award}
          label="EPA 608 Number"
          sub={user?.epa_608_number || 'TAP TO ADD'}
          right={<NavChevron />}
        />
        <Divider />
        <SettingRow
          icon={KeyRound}
          label="State License Number"
          sub={user?.state_license_number || 'TAP TO ADD'}
          right={<NavChevron />}
        />
      </div>

      {/* ============================================================ */}
      {/*  ZONE_04: ACCOUNT                                            */}
      {/* ============================================================ */}
      <SectionHeader label="ZONE_04: ACCOUNT" />

      <div className="bg-surface-container-low ghost-border rounded-lg mx-4 overflow-hidden">
        <SettingRow
          icon={Mail}
          label="Email"
          sub={user?.email?.toUpperCase() || 'NOT SET'}
          right={<NavChevron />}
        />
        <Divider />
        <SettingRow
          icon={Lock}
          label="Change Password"
          onClick={() => setShowPasswordModal(true)}
          right={<NavChevron />}
        />
      </div>

      {/* ============================================================ */}
      {/*  ZONE_05: SUBSCRIPTION                                       */}
      {/* ============================================================ */}
      <SectionHeader label="ZONE_05: SUBSCRIPTION" />

      <div className="bg-surface-container-low ghost-border rounded-lg mx-4 overflow-hidden">
        <SettingRow
          icon={CreditCard}
          label="Current Plan"
          sub="FREE TIER &mdash; ACTIVE"
          right={<NavChevron />}
        />
        <Divider />
        <SettingRow icon={CreditCard} label="Manage Subscription" right={<NavChevron />} />
      </div>

      {/* ============================================================ */}
      {/*  ZONE_06: ABOUT                                              */}
      {/* ============================================================ */}
      <SectionHeader label="ZONE_06: ABOUT" />

      <div className="bg-surface-container-low ghost-border rounded-lg mx-4 overflow-hidden">
        <SettingRow
          icon={FileText}
          label="Terms of Service"
          sub="VERSION 1.2"
          right={<NavChevron />}
        />
        <Divider />
        <SettingRow icon={Shield} label="Privacy Policy" right={<NavChevron />} />
        <Divider />
        <SettingRow icon={Info} label="App Version" sub="4.8.2-A" />
      </div>

      {/* Sign Out */}
      <div className="mx-4 mt-5">
        <button
          onClick={handleSignOut}
          className="w-full h-12 rounded-lg border border-error/40 font-headline font-bold text-sm uppercase tracking-wider text-error transition-colors active:bg-error/10 flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          SIGN OUT
        </button>
      </div>

      {/* ============================================================ */}
      {/*  WRENCH GRAPHIC + FOOTER                                     */}
      {/* ============================================================ */}
      <div className="flex flex-col items-center mt-10 mb-4 opacity-[0.07]">
        <Wrench className="w-24 h-24" />
      </div>

      <div className="text-center pb-4">
        <p className="font-headline text-[10px] uppercase tracking-[0.25em] text-outline/50">
          FIRMWARE V.4.8.2-A
        </p>
        <p className="font-headline text-[9px] uppercase tracking-[0.2em] text-outline/30 mt-1">
          MACHINED BY INDUSTRIAL UI CORE
        </p>
      </div>
    </div>
  );
}
