-- ============================================================
-- Senior Tech v2 — Full Database Setup
-- Paste this entire script into:
-- https://supabase.com/dashboard/project/sdozyaozbwwivcdjeqrv/sql/new
-- Then click "Run"
-- ============================================================

-- TABLE: users
CREATE TABLE IF NOT EXISTS public.users (
  id                      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_id                 uuid UNIQUE NOT NULL,
  first_name              text NOT NULL,
  last_name               text NOT NULL,
  email                   text NOT NULL,
  company_name            text,
  epa_608_number          text,
  state_license_number    text,
  experience_level        text,
  years_experience_range  text,
  trade_focus             text[],
  onboarding_completed_at timestamptz,
  terms_version_accepted  text,
  email_verified_at       timestamptz,
  high_contrast           boolean DEFAULT false,
  auto_sync               boolean DEFAULT true,
  biometric_login         boolean DEFAULT false,
  created_at              timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_auth_id_idx ON public.users (auth_id);

-- TABLE: user_acknowledgments
CREATE TABLE IF NOT EXISTS public.user_acknowledgments (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  acknowledgment_type  text NOT NULL,
  acknowledged_at      timestamptz NOT NULL,
  app_version          text,
  terms_version        text,
  created_at           timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_ack_user_id_idx ON public.user_acknowledgments (user_id);

-- TABLE: diagnostic_sessions
CREATE TABLE IF NOT EXISTS public.diagnostic_sessions (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  started_at            timestamptz NOT NULL DEFAULT now(),
  ended_at              timestamptz,
  status                text NOT NULL DEFAULT 'ongoing',
  equipment_brand       text,
  equipment_model       text,
  serial_number         text,
  opening_message       text,
  full_conversation     jsonb,
  job_summary           text,
  checklist             text,
  manual_ids_referenced text[],
  session_state         jsonb,
  conversation_version  integer DEFAULT 1,
  created_at            timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS diag_user_id_idx    ON public.diagnostic_sessions (user_id);
CREATE INDEX IF NOT EXISTS diag_started_at_idx ON public.diagnostic_sessions (started_at DESC);

-- TABLE: manual_searches
CREATE TABLE IF NOT EXISTS public.manual_searches (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid NOT NULL,
  model_number text NOT NULL,
  brand        text NOT NULL,
  manual_urls  jsonb NOT NULL DEFAULT '[]',
  search_date  timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS manual_user_id_idx     ON public.manual_searches (user_id);
CREATE INDEX IF NOT EXISTS manual_model_brand_idx ON public.manual_searches (model_number, brand);
CREATE INDEX IF NOT EXISTS manual_search_date_idx ON public.manual_searches (search_date DESC);

-- TABLE: api_usage
CREATE TABLE IF NOT EXISTS public.api_usage (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid NOT NULL,
  date           date NOT NULL DEFAULT CURRENT_DATE,
  model_used     text,
  input_tokens   integer DEFAULT 0,
  output_tokens  integer DEFAULT 0,
  estimated_cost numeric(10,6) DEFAULT 0,
  request_type   text,
  created_at     timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS api_usage_user_date_idx ON public.api_usage (user_id, date);

-- TABLE: safety_acknowledgments
CREATE TABLE IF NOT EXISTS public.safety_acknowledgments (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid NOT NULL,
  session_id      uuid,
  trigger_phrase  text NOT NULL,
  triggered_at    timestamptz NOT NULL,
  acknowledged_at timestamptz,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS safety_user_id_idx ON public.safety_acknowledgments (user_id);

-- TABLE: corrections
CREATE TABLE IF NOT EXISTS public.corrections (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             uuid NOT NULL,
  session_id          uuid,
  brand               text,
  model               text,
  serial              text,
  error_category      text NOT NULL,
  correct_value       text,
  ai_response_excerpt text,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS corrections_user_id_idx ON public.corrections (user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_acknowledgments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_searches        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corrections            ENABLE ROW LEVEL SECURITY;

-- users policies
CREATE POLICY "users_select" ON public.users FOR SELECT USING (auth_id = auth.uid());
CREATE POLICY "users_insert" ON public.users FOR INSERT WITH CHECK (auth_id = auth.uid());
CREATE POLICY "users_update" ON public.users FOR UPDATE USING (auth_id = auth.uid()) WITH CHECK (auth_id = auth.uid());

-- user_acknowledgments policies
CREATE POLICY "ack_select" ON public.user_acknowledgments FOR SELECT
  USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
CREATE POLICY "ack_insert" ON public.user_acknowledgments FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- diagnostic_sessions policies
CREATE POLICY "diag_select" ON public.diagnostic_sessions FOR SELECT
  USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
CREATE POLICY "diag_insert" ON public.diagnostic_sessions FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
CREATE POLICY "diag_update" ON public.diagnostic_sessions FOR UPDATE
  USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
CREATE POLICY "diag_delete" ON public.diagnostic_sessions FOR DELETE
  USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- manual_searches policies
CREATE POLICY "manual_select" ON public.manual_searches FOR SELECT
  USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
    OR brand = '__system_cache__');
CREATE POLICY "manual_insert" ON public.manual_searches FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
CREATE POLICY "manual_update" ON public.manual_searches FOR UPDATE
  USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
CREATE POLICY "manual_delete" ON public.manual_searches FOR DELETE
  USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- api_usage policies (written by service role, readable by owner)
CREATE POLICY "api_usage_select" ON public.api_usage FOR SELECT
  USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- safety_acknowledgments policies
CREATE POLICY "safety_select" ON public.safety_acknowledgments FOR SELECT
  USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
CREATE POLICY "safety_insert" ON public.safety_acknowledgments FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- corrections policies
CREATE POLICY "corrections_select" ON public.corrections FOR SELECT
  USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
CREATE POLICY "corrections_insert" ON public.corrections FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
