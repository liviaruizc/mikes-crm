-- Rename settings table to user
ALTER TABLE settings RENAME TO "user";

-- Add full_name column if it doesn't exist
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Add user_id column if it doesn't exist
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policies
DROP POLICY IF EXISTS "Allow all operations on settings" ON "user";

CREATE POLICY "Users can view their own profile" ON "user"
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON "user"
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON "user"
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

