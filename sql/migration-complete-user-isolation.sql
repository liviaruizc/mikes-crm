-- Complete Migration: Create settings table and add user isolation with RLS policies
-- Run this migration in your Supabase SQL Editor
-- This ensures each user only sees their own data

-- STEP 1: Create settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 2: Add user_id columns to all tables
ALTER TABLE customers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- STEP 3: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS customers_user_id_idx ON customers(user_id);
CREATE INDEX IF NOT EXISTS appointments_user_id_idx ON appointments(user_id);
CREATE INDEX IF NOT EXISTS settings_user_id_idx ON settings(user_id);

-- STEP 4: Enable Row Level Security on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- STEP 5: Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can only see their own customers" ON customers;
DROP POLICY IF EXISTS "Users can only insert their own customers" ON customers;
DROP POLICY IF EXISTS "Users can only update their own customers" ON customers;
DROP POLICY IF EXISTS "Users can only delete their own customers" ON customers;

DROP POLICY IF EXISTS "Users can only see their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can only insert their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can only update their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can only delete their own appointments" ON appointments;

DROP POLICY IF EXISTS "Users can only see their own settings" ON settings;
DROP POLICY IF EXISTS "Users can only insert their own settings" ON settings;
DROP POLICY IF EXISTS "Users can only update their own settings" ON settings;
DROP POLICY IF EXISTS "Allow all operations on settings" ON settings;

-- STEP 6: Create RLS policies for customers table
CREATE POLICY "Users can only see their own customers"
  ON customers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own customers"
  ON customers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own customers"
  ON customers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own customers"
  ON customers FOR DELETE
  USING (auth.uid() = user_id);

-- STEP 7: Create RLS policies for appointments table
CREATE POLICY "Users can only see their own appointments"
  ON appointments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own appointments"
  ON appointments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own appointments"
  ON appointments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own appointments"
  ON appointments FOR DELETE
  USING (auth.uid() = user_id);

-- STEP 8: Create RLS policies for settings table
CREATE POLICY "Users can only see their own settings"
  ON settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own settings"
  ON settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own settings"
  ON settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- STEP 9: If you have existing data, assign it to a specific user
-- Uncomment and replace 'YOUR_USER_ID_HERE' with an actual user ID from auth.users
-- To get a user ID, run: SELECT id, email FROM auth.users;
-- 
-- UPDATE customers SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;
-- UPDATE appointments SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;
-- UPDATE settings SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;
