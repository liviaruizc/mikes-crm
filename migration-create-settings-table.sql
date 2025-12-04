-- Create settings table for application configuration
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default owner phone if table is empty
INSERT INTO settings (owner_phone)
SELECT '9417633317'
WHERE NOT EXISTS (SELECT 1 FROM settings);

-- Add RLS policies
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (you can restrict this later)
CREATE POLICY "Allow all operations on settings" ON settings
  FOR ALL
  USING (true)
  WITH CHECK (true);
