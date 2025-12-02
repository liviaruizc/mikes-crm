import express from 'express';
import cors from 'cors';
import twilio from 'twilio';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '.env.local') });


const app = express();
app.use(cors());
app.use(express.json());

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.post('/api/send-sms', async (req, res) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ error: 'Missing required fields: to, message' });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

  console.log('Environment check:', {
    hasSid: !!accountSid,
    hasToken: !!authToken,
    hasPhone: !!twilioPhoneNumber,
    sid: accountSid?.substring(0, 10) + '...',
  });

  if (!accountSid || !authToken || !twilioPhoneNumber) {
    console.error('Missing Twilio credentials');
    return res.status(500).json({ 
      error: 'Server configuration error. Please set up Twilio credentials.' 
    });
  }

  try {
    const client = twilio(accountSid, authToken);
    
    console.log(`Attempting to send SMS from ${twilioPhoneNumber} to +19417633317`);
    console.log(`Message: ${message}`);
    
    const result = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: '+19417633317',
    });

    console.log(`✅ SMS sent successfully!`);
    console.log(`Message SID: ${result.sid}`);
    console.log(`Status: ${result.status}`);
    console.log(`To: ${result.to}`);
    console.log(`From: ${result.from}`);
    
    // Check for any error info
    if (result.errorCode) {
      console.log(`⚠️ Error Code: ${result.errorCode}`);
      console.log(`⚠️ Error Message: ${result.errorMessage}`);
    }
    
    return res.status(200).json({ 
      success: true, 
      messageSid: result.sid,
      status: result.status,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage
    });
  } catch (error) {
    console.error('❌ Twilio error:', error.message);
    console.error('Error code:', error.code);
    console.error('More info:', error.moreInfo);
    return res.status(500).json({ 
      error: 'Failed to send SMS', 
      details: error.message,
      code: error.code
    });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`SMS API server running on http://localhost:${PORT}`);
});
