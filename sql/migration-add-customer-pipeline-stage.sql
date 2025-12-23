-- Add pipeline_stage column to customers table
-- Run this in your Supabase SQL Editor

ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'New';

-- Set existing customers to 'New' status
UPDATE customers 
SET pipeline_stage = 'New' 
WHERE pipeline_stage IS NULL;

-- Optional: Add a check constraint to ensure valid stages
ALTER TABLE customers 
ADD CONSTRAINT customers_pipeline_stage_check 
CHECK (pipeline_stage IN ('New', 'Contacted', 'Appointment Scheduled', 'Negotiation', 'Won', 'Lost'));

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_customers_pipeline_stage ON customers(pipeline_stage);
