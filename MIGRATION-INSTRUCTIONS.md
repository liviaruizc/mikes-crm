# User Isolation Migration Instructions

## Overview
This migration adds Row Level Security (RLS) to ensure each user only sees their own data in the CRM system.

## Steps to Apply Migration

### 1. Run the Migration SQL
Execute the SQL file in your Supabase SQL Editor:
- Go to your Supabase project dashboard
- Navigate to SQL Editor
- Copy and paste the contents of `migration-add-user-isolation.sql`
- Click "Run" to execute

This will:
- Add `user_id` columns to `customers`, `appointments`, and `settings` tables
- Enable Row Level Security on all tables
- Create policies to isolate data by user

### 2. Update Environment Variables (For Automated Reminders)
The server.js file handles automated SMS reminders. To allow the server to access all users' appointments for sending reminders, you need to:

1. In your Supabase dashboard, go to Settings → API
2. Copy your **Service Role Key** (NOT the anon key)
3. Add to your `.env.local` file:
   ```env
   VITE_SUPABASE_SERVICE_KEY=your_service_role_key_here
   ```

4. Update `server.js` to use the service key for cron jobs:
   ```javascript
   // Add after the existing supabase client
   const supabaseService = createClient(
     supabaseUrl, 
     process.env.VITE_SUPABASE_SERVICE_KEY
   );
   ```

5. Update the `checkAndSendReminders()` function to use `supabaseService` instead of `supabase`

**⚠️ IMPORTANT:** The service role key bypasses RLS and should ONLY be used server-side, never in frontend code.

### 3. Verify the Migration

After running the migration:

1. **Test New User Registration:**
   - Create a new user account
   - Add a customer - it should automatically be associated with your user
   - Verify you can't see data from other users

2. **Test Existing Data:**
   - Existing data will have `user_id = NULL`
   - These records won't be visible until you assign them to a user
   - You can manually update them in Supabase SQL Editor:
     ```sql
     -- Assign all existing customers to a specific user
     UPDATE customers 
     SET user_id = 'USER_UUID_HERE' 
     WHERE user_id IS NULL;
     
     UPDATE appointments 
     SET user_id = 'USER_UUID_HERE' 
     WHERE user_id IS NULL;
     
     UPDATE settings 
     SET user_id = 'USER_UUID_HERE' 
     WHERE user_id IS NULL;
     ```

3. **Test Settings Page:**
   - Each user should have their own owner phone number
   - Settings should not be shared between users

## What Changed in the Code

### Frontend Changes:
- `src/lib/supabaseClient.ts`: Added `getCurrentUserId()` helper function
- `src/components/Customers/CustomerForm.tsx`: Automatically adds `user_id` when creating customers
- `src/pages/AppointmentFormPage.tsx`: Automatically adds `user_id` when creating appointments
- `src/pages/SettingsPage.tsx`: Filters and adds `user_id` for settings
- `src/pages/HomePage.tsx`: Filters settings by `user_id`
- `src/pages/CalendarPage.tsx`: Filters settings by `user_id`

### Database Changes:
- Added `user_id UUID` column to `customers`, `appointments`, and `settings` tables
- Added indexes for performance: `customers_user_id_idx`, `appointments_user_id_idx`, `settings_user_id_idx`
- Enabled RLS on all tables
- Created SELECT, INSERT, UPDATE, DELETE policies for each table

## Rollback (If Needed)

If you need to rollback the migration:

```sql
-- Disable RLS
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- Drop policies
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

-- Remove columns (optional - will lose user association)
ALTER TABLE customers DROP COLUMN IF EXISTS user_id;
ALTER TABLE appointments DROP COLUMN IF EXISTS user_id;
ALTER TABLE settings DROP COLUMN IF EXISTS user_id;
```

## Support

If you encounter any issues during migration:
1. Check Supabase logs for RLS policy errors
2. Verify user_id is being set correctly in browser dev tools
3. Ensure you're logged in before creating/viewing data
4. Check that the migration SQL ran without errors
