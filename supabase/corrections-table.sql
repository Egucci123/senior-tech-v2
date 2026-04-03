-- AI Corrections table
-- Stores tech-flagged errors on AI responses for prompt improvement
create table if not exists corrections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  session_id uuid,
  brand text,
  model text,
  serial text,
  error_category text not null, -- 'serial_date' | 'unit_type' | 'brand' | 'specs' | 'manual' | 'other'
  correct_value text,            -- what the tech says it should be
  ai_response_excerpt text,      -- snippet of what the AI got wrong
  created_at timestamptz default now()
);

alter table corrections enable row level security;

-- Users can insert their own corrections
create policy "Users can insert corrections"
  on corrections for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can read their own corrections
create policy "Users can read own corrections"
  on corrections for select
  to authenticated
  using (auth.uid() = user_id);
