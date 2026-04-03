-- Fix corrections RLS — allow any authenticated user to insert
-- The user_id field is still stored for reference but not enforced on insert
drop policy if exists "Users can insert corrections" on corrections;

create policy "Authenticated users can insert corrections"
  on corrections for insert
  to authenticated
  with check (true);
