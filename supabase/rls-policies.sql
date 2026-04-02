-- Run these in the Supabase SQL editor to enforce row-level security.
-- IMPORTANT: After enabling RLS, all server-side API routes must use
-- the supabaseAdmin (service role) client for system queries.

-- Enable RLS on api_usage
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own usage" ON api_usage
  FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users insert own usage" ON api_usage
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Enable RLS on diagnostic_sessions
ALTER TABLE diagnostic_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own sessions" ON diagnostic_sessions
  FOR ALL USING (auth.uid()::text = user_id::text);

-- Enable RLS on manual_searches
ALTER TABLE manual_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own manual searches" ON manual_searches
  FOR ALL USING (auth.uid()::text = user_id::text);
