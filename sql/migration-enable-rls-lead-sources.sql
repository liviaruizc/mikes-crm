-- Migration: Enable RLS on lead_sources table
-- Lead sources are shared/default data that all users can read
-- But only the creator can modify their own lead sources

-- Add user_id column to lead_sources table if not exists (for future custom lead sources)
ALTER TABLE lead_sources ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS lead_sources_user_id_idx ON lead_sources(user_id);

-- Enable Row Level Security
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view lead sources" ON lead_sources;
DROP POLICY IF EXISTS "Users can only insert their own lead sources" ON lead_sources;
DROP POLICY IF EXISTS "Users can only update their own lead sources" ON lead_sources;
DROP POLICY IF EXISTS "Users can only delete their own lead sources" ON lead_sources;

-- Create RLS policies for lead_sources table
-- Allow all authenticated users to READ all lead sources (shared/default data)
CREATE POLICY "Anyone can view lead sources"
  ON lead_sources FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can only insert their own lead sources (for custom ones)
CREATE POLICY "Users can only insert their own lead sources"
  ON lead_sources FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own lead sources
CREATE POLICY "Users can only update their own lead sources"
  ON lead_sources FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own lead sources
CREATE POLICY "Users can only delete their own lead sources"
  ON lead_sources FOR DELETE
  USING (auth.uid() = user_id);

-- Note: Existing lead_sources with user_id = NULL will be visible to all users
-- This allows default/system lead sources to remain accessible
