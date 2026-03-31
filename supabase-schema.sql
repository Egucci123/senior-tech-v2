-- Senior Tech HVAC Diagnostic App — Supabase Schema
-- Run this in Supabase SQL Editor to set up all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company_name TEXT,
  email TEXT UNIQUE NOT NULL,
  epa_608_number TEXT,
  state_license_number TEXT,
  experience_level TEXT CHECK (experience_level IN ('junior', 'mid', 'senior', 'veteran', 'master')),
  years_experience_range TEXT CHECK (years_experience_range IN ('1-3', '4-7', '8-12', '13-19', '20+')),
  trade_focus TEXT[] DEFAULT '{}',
  onboarding_completed_at TIMESTAMPTZ,
  terms_version_accepted TEXT DEFAULT '1.2',
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USER ACKNOWLEDGMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_acknowledgments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  acknowledgment_type TEXT NOT NULL,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  app_version TEXT NOT NULL DEFAULT '1.0.0',
  terms_version TEXT NOT NULL DEFAULT '1.2'
);

CREATE INDEX idx_user_acknowledgments_user_id ON user_acknowledgments(user_id);

-- ============================================
-- DIAGNOSTIC SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS diagnostic_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  equipment_brand TEXT,
  equipment_model TEXT,
  serial_number TEXT,
  opening_message TEXT,
  status TEXT CHECK (status IN ('resolved', 'ongoing', 'unresolved')) DEFAULT 'ongoing',
  full_conversation JSONB DEFAULT '[]'::JSONB,
  job_summary TEXT,
  checklist TEXT,
  manual_ids_referenced TEXT[] DEFAULT '{}',
  session_state JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_diagnostic_sessions_user_id ON diagnostic_sessions(user_id);
CREATE INDEX idx_diagnostic_sessions_equipment ON diagnostic_sessions(user_id, equipment_model);

-- ============================================
-- MANUAL SEARCHES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS manual_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  model_number TEXT NOT NULL,
  brand TEXT,
  search_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  manual_urls JSONB DEFAULT '[]'::JSONB
);

CREATE INDEX idx_manual_searches_user_id ON manual_searches(user_id);

-- ============================================
-- API USAGE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  model_used TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
  request_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_usage_user_date ON api_usage(user_id, date);

-- ============================================
-- SAFETY ACKNOWLEDGMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS safety_acknowledgments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES diagnostic_sessions(id) ON DELETE SET NULL,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trigger_phrase TEXT NOT NULL,
  acknowledged_at TIMESTAMPTZ
);

CREATE INDEX idx_safety_ack_user_id ON safety_acknowledgments(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_acknowledgments ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth_id = auth.uid());
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth_id = auth.uid());

CREATE POLICY "Users can manage own acknowledgments" ON user_acknowledgments
  FOR ALL USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can manage own sessions" ON diagnostic_sessions
  FOR ALL USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can manage own manual searches" ON manual_searches
  FOR ALL USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can view own api usage" ON api_usage
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY "Users can insert own api usage" ON api_usage
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can manage own safety acks" ON safety_acknowledgments
  FOR ALL USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get daily message count for rate limiting
CREATE OR REPLACE FUNCTION get_daily_message_count(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM api_usage
  WHERE user_id = p_user_id AND date = CURRENT_DATE;
$$ LANGUAGE SQL STABLE;

-- Function to keep only last 5 manual searches per user
CREATE OR REPLACE FUNCTION trim_manual_searches()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM manual_searches
  WHERE id IN (
    SELECT id FROM manual_searches
    WHERE user_id = NEW.user_id
    ORDER BY search_date DESC
    OFFSET 5
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trim_manual_searches_trigger
  AFTER INSERT ON manual_searches
  FOR EACH ROW EXECUTE FUNCTION trim_manual_searches();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
