import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("[Supabase] Missing env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

/**
 * Cookie-backed storage adapter for Supabase auth.
 * Stores sessions in BOTH localStorage and a cookie so sessions survive
 * iOS Safari ITP (which clears localStorage for infrequently-visited sites).
 */
function createSessionStorage() {
  if (typeof window === "undefined") return undefined; // SSR: no-op

  const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

  function getCookie(key: string): string | null {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(encodeURIComponent(key) + "="));
    if (!match) return null;
    try {
      return decodeURIComponent(match.split("=").slice(1).join("="));
    } catch {
      return null;
    }
  }

  function setCookie(key: string, value: string) {
    try {
      document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
    } catch { /* cookie too large or blocked — localStorage still works */ }
  }

  function removeCookie(key: string) {
    document.cookie = `${encodeURIComponent(key)}=; max-age=0; path=/`;
  }

  return {
    getItem: (key: string): string | null => {
      try {
        const ls = localStorage.getItem(key);
        if (ls !== null) return ls;
      } catch { /* noop */ }
      return getCookie(key);
    },
    setItem: (key: string, value: string): void => {
      try { localStorage.setItem(key, value); } catch { /* noop */ }
      setCookie(key, value);
    },
    removeItem: (key: string): void => {
      try { localStorage.removeItem(key); } catch { /* noop */ }
      removeCookie(key);
    },
  };
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: createSessionStorage(),
  },
});

// ────────────────────────────────────────────
// Auth helpers
// ────────────────────────────────────────────

export async function signUp(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getSession() {
  return supabase.auth.getSession();
}

export async function getAuthUser() {
  return supabase.auth.getUser();
}

// ────────────────────────────────────────────
// User profile (table: users)
// ────────────────────────────────────────────

export async function createUserProfile(
  authId: string,
  data: {
    first_name: string;
    last_name: string;
    email: string;
    company_name?: string;
    epa_608_number?: string;
    state_license_number?: string;
    experience_level?: string;
    years_experience_range?: string;
    trade_focus?: string[];
  }
) {
  return supabase.from("users").insert({
    auth_id: authId,
    ...data,
    onboarding_completed_at: new Date().toISOString(),
    terms_version_accepted: "1.2",
  }).select().single();
}

export async function getUserProfile(authId: string) {
  return supabase.from("users").select("*").eq("auth_id", authId).single();
}

export async function updateUserProfile(
  authId: string,
  updates: Record<string, unknown>
) {
  return supabase.from("users").update(updates).eq("auth_id", authId).select().single();
}

// ────────────────────────────────────────────
// Acknowledgments (table: user_acknowledgments)
// ────────────────────────────────────────────

export async function createAcknowledgments(
  userId: string,
  types: string[],
  appVersion: string,
  termsVersion: string
) {
  const rows = types.map((type) => ({
    user_id: userId,
    acknowledgment_type: type,
    acknowledged_at: new Date().toISOString(),
    app_version: appVersion,
    terms_version: termsVersion,
  }));
  return supabase.from("user_acknowledgments").insert(rows).select();
}

// ────────────────────────────────────────────
// Diagnostic sessions (table: diagnostic_sessions)
// ────────────────────────────────────────────

export async function createDiagnosticSession(userId: string) {
  return supabase
    .from("diagnostic_sessions")
    .insert({
      user_id: userId,
      started_at: new Date().toISOString(),
      status: "ongoing",
    })
    .select()
    .single();
}

export async function updateDiagnosticSession(
  sessionId: string,
  updates: Record<string, unknown>,
  userId: string
) {
  return supabase
    .from("diagnostic_sessions")
    .update(updates)
    .eq("id", sessionId)
    .eq("user_id", userId)
    .select()
    .single();
}

export async function endDiagnosticSession(
  sessionId: string,
  status: "resolved" | "unresolved",
  jobSummary?: string,
  checklist?: string
) {
  return supabase
    .from("diagnostic_sessions")
    .update({
      ended_at: new Date().toISOString(),
      status,
      ...(jobSummary !== undefined && { job_summary: jobSummary }),
      ...(checklist !== undefined && { checklist }),
    })
    .eq("id", sessionId)
    .select()
    .single();
}

export async function getDiagnosticSessions(
  userId: string,
  status?: string,
  limit?: number
) {
  let query = supabase
    .from("diagnostic_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }
  if (limit) {
    query = query.limit(limit);
  }

  return query;
}

export async function getDiagnosticSession(sessionId: string) {
  return supabase
    .from("diagnostic_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();
}

export async function deleteAllDiagnosticSessions(userId: string) {
  return supabase
    .from("diagnostic_sessions")
    .delete()
    .eq("user_id", userId);
}

export async function deleteAllManualSearches(userId: string) {
  return supabase
    .from("manual_searches")
    .delete()
    .eq("user_id", userId);
}

// ────────────────────────────────────────────
// Manual searches (table: manual_searches)
// ────────────────────────────────────────────

export async function createManualSearch(
  userId: string,
  modelNumber: string,
  brand: string,
  manualUrls: { type: string; url: string; source?: 1 | 2 | 3 }[]
) {
  // Check for existing entry — one row per user+model, update if exists
  const { data: existing } = await supabase
    .from("manual_searches")
    .select("id")
    .eq("user_id", userId)
    .eq("model_number", modelNumber)
    .maybeSingle();

  if (existing?.id) {
    return supabase
      .from("manual_searches")
      .update({ brand, manual_urls: manualUrls, search_date: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();
  }

  return supabase
    .from("manual_searches")
    .insert({
      user_id: userId,
      model_number: modelNumber,
      brand,
      manual_urls: manualUrls,
    })
    .select()
    .single();
}

export async function getManualSearches(userId: string, limit = 20, offset = 0) {
  return supabase
    .from("manual_searches")
    .select("*")
    .eq("user_id", userId)
    .neq("brand", "__system_cache__")   // exclude server-side cache rows (manual_urls is an object, not array)
    .neq("model_number", "")            // exclude rows with no model number
    .order("search_date", { ascending: false })
    .range(offset, offset + limit - 1);
}

// ────────────────────────────────────────────
// API usage (table: api_usage)
// ────────────────────────────────────────────

export async function logApiUsage(
  userId: string,
  modelUsed: string,
  inputTokens: number,
  outputTokens: number,
  estimatedCost: number,
  requestType: string
) {
  return supabase
    .from("api_usage")
    .insert({
      user_id: userId,
      model_used: modelUsed,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost: estimatedCost,
      request_type: requestType,
    })
    .select()
    .single();
}

export async function getDailyMessageCount(userId: string) {
  const today = new Date().toISOString().split("T")[0];
  return supabase
    .from("api_usage")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("date", today);
}

// ────────────────────────────────────────────
// Safety acknowledgments (table: safety_acknowledgments)
// ────────────────────────────────────────────

export async function logSafetyAcknowledgment(
  userId: string,
  sessionId: string,
  triggerPhrase: string
) {
  return supabase
    .from("safety_acknowledgments")
    .insert({
      user_id: userId,
      session_id: sessionId,
      trigger_phrase: triggerPhrase,
      triggered_at: new Date().toISOString(),
    })
    .select()
    .single();
}

// ────────────────────────────────────────────
// Corrections (table: corrections)
// ────────────────────────────────────────────

export async function createCorrection(data: {
  user_id: string;
  session_id?: string;
  brand?: string;
  model?: string;
  serial?: string;
  error_category: string;
  correct_value?: string;
  ai_response_excerpt?: string;
}) {
  return supabase.from("corrections").insert({
    ...data,
    created_at: new Date().toISOString(),
  });
}
