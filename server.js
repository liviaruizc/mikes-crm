/**
 * Express Server for Contractor's CRM
 * 
 * Provides backend API for:
 * - Sending SMS reminders via Vonage API
 * - Automated appointment reminder cron job (every 30 minutes)
 * - CORS-restricted endpoints for security
 * - Rate limiting to prevent abuse
 * 
 * Port: 3001
 * 
 * Security Features:
 * - JWT authentication required for all endpoints
 * - Rate limiting (10 requests per 15 minutes)
 * - CORS restricted to specific origins
 * - Request validation
 */

import express from 'express';
import cors from 'cors';
import twilio from 'twilio';
import { Vonage } from '@vonage/server-sdk';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import rateLimit from 'express-rate-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
config({ path: join(__dirname, '.env.local') });

// Initialize Supabase client for database access
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Get owner phone number from database settings
 * Falls back to default if not found
 * @returns {Promise<string>} Owner phone number
 */
async function getOwnerPhone() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('owner_phone')
      .single();
    
    if (error || !data?.owner_phone) {
      console.log('⚠️ No owner phone in database, using default: 19417633317');
      return '19417633317';
    }
    
    return data.owner_phone;
  } catch (err) {
    console.error('Error fetching owner phone:', err);
    return '9417633317'; // Fallback
  }
}


const app = express();

// Configure CORS with specific origins
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Capacitor, native apps)
    if (!origin) return callback(null, true);
    
    // Allow Capacitor apps (capacitor://, ionic://, http://localhost, etc.)
    if (origin.startsWith('capacitor://') || 
        origin.startsWith('ionic://') || 
        origin.startsWith('http://localhost') ||
        origin.startsWith('https://localhost')) {
      return callback(null, true);
    }
    
    // Check configured allowed origins
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Authentication middleware
const authenticateRequest = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header' });
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
    
    req.user = user;
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    return res.status(401).json({ error: 'Unauthorized: Authentication failed' });
  }
};

// Rate limiter for SMS endpoint (max 10 requests per 15 minutes per IP)
const smsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: 'Too many SMS requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper function to format US phone numbers with +1
function formatUSPhoneNumber(phone) {
  if (!phone) return phone;
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If it's a 10-digit US number, add +1
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  
  // If it already has country code (11 digits starting with 1), add +
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  
  // If it already starts with +, return as is
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // Otherwise return the cleaned number with +
  return `+${cleaned}`;
}

app.post('/api/send-sms', smsLimiter, authenticateRequest, async (req, res) => {
  let { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ error: 'Missing required fields: to, message' });
  }
  
  // Log authenticated user making the request
  console.log(`SMS request from user: ${req.user.email}`);

  // Format phone number with +1 for US
  to = formatUSPhoneNumber(to);

  const vonageApiKey = process.env.VONAGE_API_KEY;
  const vonageApiSecret = process.env.VONAGE_API_SECRET;
  const vonageFromNumber = process.env.VONAGE_FROM_NUMBER;

  if (!vonageApiKey || !vonageApiSecret || !vonageFromNumber) {
    console.error('Missing Vonage credentials');
    return res.status(500).json({ 
      error: 'Server configuration error. Please set up Vonage credentials.' 
    });
  }

  try {
    const vonage = new Vonage({
      apiKey: process.env.VONAGE_API_KEY,
      apiSecret: process.env.VONAGE_API_SECRET,
    });
    
    console.log(`Attempting to send SMS via Vonage from ${process.env.VONAGE_FROM_NUMBER} to ${to}`);
    console.log(`Message: ${message}`);
    
    const result = await vonage.sms.send({
      to: to,
      from: process.env.VONAGE_FROM_NUMBER,
      text: message,
    });

    console.log(`✅ Vonage SMS sent successfully!`);
    console.log(`Status: ${result.messages[0].status}`);
    console.log(`Message ID: ${result.messages[0]['message-id']}`);
    
    return res.status(200).json({ 
      success: true, 
      messageId: result.messages[0]['message-id'],
      status: result.messages[0].status
    });
  } catch (error) {
    console.error('❌ Vonage error:', error.message);
    return res.status(500).json({ 
      error: 'Failed to send SMS via Vonage', 
      details: error.message
    });
  }
});

// Function to send SMS via Vonage
async function sendVonageSMS(to, message) {
  // Format phone number with +1 for US
  to = formatUSPhoneNumber(to);
  
  const vonageApiKey = process.env.VONAGE_API_KEY;
  const vonageApiSecret = process.env.VONAGE_API_SECRET;
  const vonageFromNumber = process.env.VONAGE_FROM_NUMBER;

  if (!vonageApiKey || !vonageApiSecret || !vonageFromNumber) {
    console.error('Missing Vonage credentials');
    return { success: false, error: 'Missing Vonage credentials' };
  }

  try {
    const vonage = new Vonage({
      apiKey: vonageApiKey,
      apiSecret: vonageApiSecret,
    });

    const result = await vonage.sms.send({
      to: to,
      from: vonageFromNumber,
      text: message,
    });

    // Check if message was actually sent successfully
    if (result.messages && result.messages[0]) {
      const msg = result.messages[0];
      if (msg.status === '0') {
        console.log(`✅ SMS sent to ${to} - Message ID: ${msg['message-id']}`);
        return { success: true, result };
      } else {
        console.error(`❌ SMS failed to ${to} - Status: ${msg.status}, Error: ${msg['error-text']}`);
        return { success: false, error: msg['error-text'] || 'SMS failed' };
      }
    }
    
    console.log(`✅ SMS sent to ${to}`);
    return { success: true, result };
  } catch (error) {
    console.error('❌ Vonage error:', error.message);
    console.error('Full error:', error);
    return { success: false, error: error.message };
  }
}

// Function to check and send appointment reminders
async function checkAndSendReminders() {
  console.log('🔍 Checking for appointments 24 hours from now...');
  
  // Calculate time window: 24 hours from now (±30 minutes for flexibility)
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const windowStart = new Date(tomorrow.getTime() - 30 * 60 * 1000); // 23.5 hours
  const windowEnd = new Date(tomorrow.getTime() + 30 * 60 * 1000);   // 24.5 hours

  try {
    // Fetch appointments in the 24-hour window with customer pipeline_stage
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        title,
        description,
        start_time,
        end_time,
        customers (
          id,
          full_name,
          phone,
          address,
          pipeline_stage
        )
      `)
      .gte('start_time', windowStart.toISOString())
      .lte('start_time', windowEnd.toISOString());

    if (error) {
      console.error('Error fetching appointments:', error);
      return;
    }

    if (!appointments || appointments.length === 0) {
      console.log('No appointments found in the next 24 hours.');
      return;
    }

    console.log(`📅 Found ${appointments.length} appointment(s) to remind about.`);

    // Send reminders for each appointment
    for (const appt of appointments) {
      const customer = appt.customers;
      const startTime = new Date(appt.start_time);
      const formattedDate = startTime.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const formattedTime = startTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });

      // Message to owner (you)
      const ownerMessage = `Reminder: Appointment with ${customer?.full_name || 'Unknown Customer'} on ${formattedDate} at ${formattedTime}. Location: ${customer?.address || 'No address'}`;
      
      // Message to customer
      const customerMessage = `Hi ${customer?.full_name || 'there'}! This is a reminder about your appointment on ${formattedDate} at ${formattedTime}. See you then!`;

      // Get owner phone from database
      const ownerPhone = await getOwnerPhone();

      // Send to owner (always)
      await sendVonageSMS(ownerPhone, ownerMessage);

      // Send to customer only if they're in "Appointment Scheduled" status and have a phone number
      if (customer?.phone && customer?.pipeline_stage === 'Appointment Scheduled') {
        await sendVonageSMS(customer.phone, customerMessage);
        console.log(`✅ Sent reminder to customer: ${customer?.full_name}`);
      } else if (customer?.pipeline_stage !== 'Appointment Scheduled') {
        console.log(`⚠️ Customer ${customer?.full_name} is not in "Appointment Scheduled" status. Only owner notified.`);
      } else {
        console.log(`⚠️ No phone number for customer: ${customer?.full_name}`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('✅ All reminders sent successfully!');
  } catch (error) {
    console.error('Error in reminder system:', error);
  }
}

// Schedule reminder checks every 30 minutes
cron.schedule('*/30 * * * *', () => {
  console.log('⏰ Running scheduled reminder check...');
  checkAndSendReminders();
});

// Run check on server startup
console.log('🚀 Reminder system initialized. Checking for appointments...');
checkAndSendReminders();

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`SMS API server running on http://localhost:${PORT}`);
  console.log(`Using Vonage for SMS`);
});
