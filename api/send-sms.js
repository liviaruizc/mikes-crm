// Twilio SMS API endpoint
// This is a serverless function that can be deployed to Vercel, Netlify, etc.

const twilio = require('twilio');
const Joi = require('joi');
const { parsePhoneNumber } = require('libphonenumber-js');

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

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate input
  const { error, value } = smsSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      error: error.details[0].message 
    });
  }

  const { to, message } = value;

  // Get Twilio credentials from environment variables
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !twilioPhoneNumber) {
    console.error('Missing Twilio credentials in environment variables');
    return res.status(500).json({ 
      error: 'Server configuration error. Please set up Twilio credentials.' 
    });
  }

  try {
    const client = twilio(accountSid, authToken);
    
    const result = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: to,
    });

    return res.status(200).json({ 
      success: true, 
      messageSid: result.sid 
    });
  } catch (error) {
    console.error('Twilio error:', error);
    return res.status(500).json({ 
      error: 'Failed to send SMS', 
      details: error.message 
    });
  }
}
