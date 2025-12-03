import express from 'express';
import cors from 'cors';
import twilio from 'twilio';
import { Vonage } from '@vonage/server-sdk';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '.env.local') });

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Your phone number for owner reminders
const OWNER_PHONE = '2392005772';


const app = express();
app.use(cors());
app.use(express.json());

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
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

app.post('/api/send-sms', async (req, res) => {
  let { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ error: 'Missing required fields: to, message' });
  }

  // Format phone number with +1 for US
  to = formatUSPhoneNumber(to);

  const vonageApiKey = process.env.VONAGE_API_KEY;
  const vonageApiSecret = process.env.VONAGE_API_SECRET;
  const vonageFromNumber = process.env.VONAGE_FROM_NUMBER;

  console.log('Vonage environment check:', {
    hasApiKey: !!vonageApiKey,
    hasApiSecret: !!vonageApiSecret,
    hasFromNumber: !!vonageFromNumber,
  });

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

    console.log(`✅ SMS sent to ${to}`);
    return { success: true, result };
  } catch (error) {
    console.error('❌ Vonage error:', error.message);
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
    // Fetch appointments in the 24-hour window
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
          address
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
      const customerMessage = `Hi ${customer?.full_name || 'there'}! This is a reminder about your appointment with Mike Renovations on ${formattedDate} at ${formattedTime}. See you then!`;

      // Send to owner
      await sendVonageSMS(OWNER_PHONE, ownerMessage);

      // Send to customer (if they have a phone number)
      if (customer?.phone) {
        await sendVonageSMS(customer.phone, customerMessage);
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
