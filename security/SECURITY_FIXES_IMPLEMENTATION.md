# Security Fixes - Implementation Plan

## 🔴 CRITICAL ISSUES - FIX THESE FIRST

### Fix #1: CORS Wildcard Configuration
**Status:** ⚠️ BLOCKING  
**Severity:** CRITICAL  
**Time Estimate:** 10 minutes

**Current Code (WRONG):**
```javascript
// server.js line 55-58
app.use(cors({
  origin: true, // ❌ ALLOWS ALL ORIGINS
  credentials: true
}));
```

**Fixed Code:**
```javascript
// Add to .env.local:
// ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,https://yourdomain.com

// server.js
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173').split(',');

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**Testing:**
```bash
# Should work:
curl -H "Origin: http://localhost:3000" http://localhost:3001/api/send-sms

# Should fail:
curl -H "Origin: https://malicious-site.com" http://localhost:3001/api/send-sms
```

---

### Fix #2: Verify Row Level Security in Supabase
**Status:** ⚠️ BLOCKING  
**Severity:** CRITICAL  
**Time Estimate:** 5 minutes verification + application of SQL

**Steps:**
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Run this query to check RLS status:
```sql
-- Check if RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname='public' 
AND tablename IN ('customers', 'appointments', 'settings', 'lead_sources');
```

**Expected Result:**
```
schemaname |   tablename   | rowsecurity
-----------+---------------+------------
 public    | customers     | t           ✅
 public    | appointments  | t           ✅
 public    | settings      | t           ✅
 public    | lead_sources  | t           ✅
```

**If any show 'f' (false):**
1. Go to SQL Editor
2. Copy entire contents of: `sql/migration-complete-user-isolation.sql`
3. Click "Run"
4. Re-run the verification query

**Verify Policies:**
```sql
-- List all policies
SELECT tablename, policyname, permissive, roles
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

### Fix #3: Service Role Key for Server-Side Operations
**Status:** ⚠️ PARTIALLY DONE  
**Severity:** CRITICAL  
**Time Estimate:** 15 minutes

**Step 1: Get Service Role Key**
1. Go to Supabase Dashboard → Settings → API
2. Copy "Service Role Key" (NOT the anon key)
3. Add to `.env.local`:
```env
VITE_SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Step 2: Update server.js**
Add this after the existing supabase client creation (around line 35):

```javascript
// Create separate client with service role key for cron jobs
// This bypasses RLS so it can access ALL users' appointments for reminders
const supabaseService = createClient(
  supabaseUrl,
  process.env.VITE_SUPABASE_SERVICE_KEY || supabaseKey
);

// Log which client is being used
if (process.env.VITE_SUPABASE_SERVICE_KEY) {
  console.log('✅ Using Service Role Key for cron jobs');
} else {
  console.warn('⚠️ Service Role Key not configured. SMS reminders may fail.');
}
```

**Step 3: Update checkAndSendReminders() function**
Change line 243 from:
```javascript
const { data: appointments, error } = await supabase.from('appointments')...
```

To:
```javascript
const { data: appointments, error } = await supabaseService.from('appointments')...
```

---

### Fix #4: Remove Sensitive Data from Logs
**Status:** ⚠️ REQUIRES CHANGES  
**Severity:** CRITICAL  
**Time Estimate:** 15 minutes

**File:** `server.js`

**Changes needed:**

1. **Line ~157-160** - SMS Endpoint logs
```javascript
// BEFORE (WRONG):
console.log(`Attempting to send SMS via Vonage from ${process.env.VONAGE_FROM_NUMBER} to ${to}`);
console.log(`Message: ${message}`);
console.log(`Status: ${result.messages[0].status}`);
console.log(`Message ID: ${result.messages[0]['message-id']}`);

// AFTER (CORRECT):
console.log(`Attempting to send SMS via Vonage to customer`);
// Don't log: to (phone number), message content, or result details
console.log(`✅ Vonage SMS sent successfully`);
```

2. **Line ~174** - sendVonageSMS function logs
```javascript
// BEFORE (WRONG):
console.log(`✅ SMS sent to ${to} - Message ID: ${msg['message-id']}`);
console.error(`❌ SMS failed to ${to} - Status: ${msg.status}, Error: ${msg['error-text']}`);

// AFTER (CORRECT):
console.log(`✅ SMS sent successfully`);
console.error(`❌ SMS failed - Status: ${msg.status}`);
```

3. **Line ~155** - User identification (this is ok to log)
```javascript
// This is GOOD - logging user email (not customer data):
console.log(`SMS request from user: ${req.user.email}`);
```

**Testing:**
```bash
# Start server with test
npm run dev

# Make an API request and check console output
# You should see logs about sending SMS but NO customer phone numbers
```

---

## 🟠 HIGH PRIORITY - FIX THIS WEEK

### Fix #5: HTTPS Enforcement
**Status:** ⏳ NOT IMPLEMENTED  
**Severity:** HIGH  
**Time Estimate:** 10 minutes

**Add to server.js (after app initialization, before routes):**

```javascript
// Enforce HTTPS in production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.get('host')}${req.url}`);
    }
  }
  next();
});

// Add security headers
app.use((req, res, next) => {
  res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('X-XSS-Protection', '1; mode=block');
  next();
});
```

---

### Fix #6: Google Maps API Key Restrictions
**Status:** ⏳ NOT CONFIGURED  
**Severity:** HIGH  
**Time Estimate:** 10 minutes

**Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Search for "Maps JavaScript API"
3. Select your key
4. Go to "Restrictions"
5. Under "Application restrictions" select "HTTP referrers (web sites)"
6. Add your domain:
```
*.yourdomain.com
yourdomain.com
localhost
```

**Better approach - Create separate key:**
1. Create a NEW API key specifically for frontend (with restrictions above)
2. Keep current key for ANY origin as backup
3. Update `.env` with frontend-restricted key

---

### Fix #7: Server-Side Login Rate Limiting
**Status:** ⏳ PARTIAL (Rate limiting exists but only on SMS)  
**Severity:** HIGH  
**Time Estimate:** 20 minutes

**Add to server.js (after imports):**

```javascript
// Rate limiting for authentication endpoints (max 5 attempts per 15 minutes per IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many login attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development', // Skip in development
});

// Login-specific limiter: more strict
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 attempts per minute
  skipSuccessfulRequests: true, // Don't count successful logins
  message: 'Too many login attempts. Wait before trying again.',
});
```

**Note:** This is for API endpoints. Supabase auth endpoints have built-in protection, but we can add additional layers.

---

## 🟡 MEDIUM PRIORITY - FIX THIS MONTH

### Fix #8: Add Security Headers Library
**Status:** ⏳ NOT INSTALLED  
**Severity:** MEDIUM  
**Time Estimate:** 5 minutes

```bash
npm install helmet
```

**Add to server.js (after express initialization):**

```javascript
import helmet from 'helmet';

// Apply all security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // May need adjustment
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
}));
```

---

### Fix #9: Input Validation
**Status:** ⏳ MINIMAL (Phone formatting exists)  
**Severity:** MEDIUM  
**Time Estimate:** 30 minutes

**Install validation library:**
```bash
npm install libphonenumber-js joi
```

**Add to server.js SMS endpoint:**

```javascript
import { parsePhoneNumber } from 'libphonenumber-js';
import Joi from 'joi';

// Validate SMS request
const smsSchema = Joi.object({
  to: Joi.string()
    .required()
    .custom((value, helpers) => {
      try {
        const parsed = parsePhoneNumber(value, 'US');
        if (!parsed || !parsed.isValid()) {
          return helpers.error('Invalid phone number');
        }
      } catch (err) {
        return helpers.error('Invalid phone number format');
      }
      return value;
    }),
  message: Joi.string()
    .max(160) // SMS limit
    .required()
    .messages({
      'string.max': 'Message cannot exceed 160 characters',
    }),
});

// In SMS endpoint:
app.post('/api/send-sms', smsLimiter, authenticateRequest, async (req, res) => {
  // Validate input
  const { error, value } = smsSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      error: error.details[0].message 
    });
  }

  let { to, message } = value;
  // ... rest of endpoint
});
```

---

### Fix #10: Audit Logging
**Status:** ⏳ NOT IMPLEMENTED  
**Severity:** MEDIUM  
**Time Estimate:** 1-2 hours

**Schema to add to Supabase:**

```sql
-- Create audit log table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(50), -- 'SELECT', 'INSERT', 'UPDATE', 'DELETE'
  table_name VARCHAR(100),
  record_id UUID,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  details JSONB -- Any additional context
);

-- Create index for queries
CREATE INDEX audit_logs_user_id_idx ON audit_logs(user_id);
CREATE INDEX audit_logs_timestamp_idx ON audit_logs(timestamp);
```

**Add logging middleware:**

```javascript
// Middleware to log all database operations
const logAudit = async (userId, action, tableName, recordId, req) => {
  try {
    await supabaseService.from('audit_logs').insert([{
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId,
      ip_address: req.ip,
      details: { endpoint: req.path },
    }]);
  } catch (err) {
    console.error('Audit logging failed:', err);
    // Don't fail the main request if audit log fails
  }
};
```

---

## Implementation Checklist

### Week 1 - Critical Fixes
- [ ] **Monday**
  - [ ] Fix CORS whitelist
  - [ ] Verify RLS enabled in Supabase
  - [ ] Add Service Role Key

- [ ] **Tuesday**
  - [ ] Remove sensitive data from logs
  - [ ] Test SMS reminders work
  - [ ] Add HTTPS enforcement

- [ ] **Wednesday**
  - [ ] Restrict Google Maps API key
  - [ ] Add server-side login rate limiting
  - [ ] Install and configure helmet

- [ ] **Thursday-Friday**
  - [ ] Manual security testing
  - [ ] Code review with team
  - [ ] Deploy to staging

### Week 2-3 - High Priority Fixes
- [ ] Add input validation
- [ ] Update all dependencies (`npm audit fix`)
- [ ] Implement audit logging

### Week 4+ - Medium Priority
- [ ] Client-side XSS protection
- [ ] Database encryption at rest
- [ ] Compliance review (GDPR/CCPA)
- [ ] Security training for team

---

## Testing Each Fix

### Test CORS:
```bash
# Allowed origin
curl -H "Origin: https://yourdomain.com" -i http://localhost:3001/api/send-sms

# Blocked origin
curl -H "Origin: https://evil.com" -i http://localhost:3001/api/send-sms
```

### Test RLS:
1. Create User A and User B
2. User A: Create customer "Alice's Customer"
3. User B: Try to query all customers - should see NONE
4. User A: Try to query all customers - should see their own

### Test HTTPS redirect:
```bash
curl -i http://yourdomain.com/api/test
# Should redirect to https://yourdomain.com/api/test
```

### Test Rate Limiting:
```bash
# Make 6 requests rapidly to /api/send-sms
# 6th should be blocked
for i in {1..6}; do
  curl -X POST http://localhost:3001/api/send-sms \
    -H "Authorization: Bearer $TOKEN" \
    -d '{}'
done
```

---

## Deployment Checklist

Before going to production:
- [ ] All CRITICAL fixes applied
- [ ] All HIGH priority fixes applied
- [ ] Security headers verified via https://securityheaders.com
- [ ] No console errors in browser
- [ ] No sensitive data in logs
- [ ] HTTPS enabled and redirects work
- [ ] API endpoints tested with curl
- [ ] Team reviewed all changes
- [ ] Backup database before migration
- [ ] Monitor logs for 24 hours post-deploy

---

**Created:** January 15, 2026  
**Target Completion:** January 22, 2026  
**Review Date:** January 24, 2026
