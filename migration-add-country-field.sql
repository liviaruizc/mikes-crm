-- Add phone_country column to customers table
-- Run this SQL in your Supabase SQL editor

ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS phone_country TEXT;

-- Set a default for existing customers (US)
UPDATE customers 
SET phone_country = 'US'
WHERE phone_country IS NULL;

-- Set default value for new records
ALTER TABLE customers 
ALTER COLUMN phone_country SET DEFAULT 'US';
