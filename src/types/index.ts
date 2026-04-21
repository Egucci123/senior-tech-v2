// ── Experience Level ──
export type ExperienceLevel =
  | "junior"
  | "mid"
  | "senior"
  | "veteran"
  | "master";

// ── User ──
export interface User {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string;
  email: string;
  epa_608_number: string;
  state_license_number: string;
  experience_level: ExperienceLevel;
  years_experience_range: string;
  trade_focus: string[];
  onboarding_completed_at: string;
  terms_version_accepted: string;
  email_verified_at: string;
  // Stripe subscription
  stripe_customer_id?: string;
  subscription_status?: "active" | "inactive" | "past_due" | "cancelled" | "trialing";
  subscription_id?: string;
  subscription_current_period_end?: string;
}

// ── Chat Message ──
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  image_url?: string;
  timestamp: string;
  metadata?: {
    requestType?: "photo" | "complex" | "simple";
    modelUsed?: string;
    inputTokens?: number;
    outputTokens?: number;
  };
}

// ── Session State (AI diagnostic context) ──
export interface SessionState {
  equipment: {
    brand: string;
    model: string;
    type: string;
    serial_number: string;
  };
  readings: {
    suction_pressure: string;
    discharge_pressure: string;
    superheat: string;
    subcooling: string;
    ambient_temp: string;
    supply_temp: string;
    return_temp: string;
  };
  symptoms: string[];
  ruled_out: string[];
  working_diagnosis: string;
  photos_received: string[];
}

// ── Diagnostic Session ──
export interface DiagnosticSession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string;
  equipment_brand: string;
  equipment_model: string;
  serial_number: string;
  opening_message: string;
  status: "resolved" | "ongoing" | "unresolved";
  full_conversation: ChatMessage[];
  job_summary: string;
  checklist: string;
  manual_ids_referenced: string[];
  session_state: SessionState;
  conversation_version?: number;
}

// ── User Acknowledgment ──
export interface UserAcknowledgment {
  id: string;
  user_id: string;
  acknowledgment_type: string;
  acknowledged_at: string;
  app_version: string;
  terms_version: string;
}

// ── Manual Search ──
export interface ManualSearch {
  id: string;
  user_id: string;
  model_number: string;
  brand: string;
  search_date: string;
  manual_urls: {
    type: string;
    url: string;
    title?: string;
    /** 1 = manufacturer OEM portal, 2 = ManualsLib, 3 = ManualsLib search */
    source?: 1 | 2 | 3;
  }[];
  /** Set for pre-2005 equipment where manuals are not available online */
  no_manual_reason?: string;
}

// ── API Usage ──
export interface ApiUsage {
  id: string;
  user_id: string;
  date: string;
  model_used: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: number;
  request_type: string;
}

// ── Safety Acknowledgment ──
export interface SafetyAcknowledgment {
  id: string;
  user_id: string;
  session_id: string;
  triggered_at: string;
  trigger_phrase: string;
  acknowledged_at: string;
}
