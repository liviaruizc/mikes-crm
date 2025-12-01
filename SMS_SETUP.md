# SMS Reminder Setup Guide

This guide will help you set up SMS reminders using Twilio.

## Prerequisites

1. A Twilio account (sign up at https://www.twilio.com/try-twilio)
2. A Twilio phone number

## Setup Steps

### 1. Install Twilio Package

```bash
npm install twilio
```

### 2. Get Your Twilio Credentials

1. Log in to your Twilio Console: https://console.twilio.com/
2. Find your Account SID and Auth Token on the dashboard
3. Get your Twilio phone number from Phone Numbers > Manage > Active Numbers

### 3. Configure Environment Variables

Add these to your `.env` file (create one if it doesn't exist):

```
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

### 4. Update Owner Phone Number

In `src/pages/CalendarPage.tsx`, find the `handleSendReminder` function and update this line:

```typescript
const ownerPhone = "+1234567890"; // Replace with your actual phone number
```

### 5. Deploy API Endpoint

The API endpoint is in `api/send-sms.js`. This can be deployed to:

- **Vercel**: Automatically works with the `/api` folder structure
- **Netlify**: Move to `netlify/functions/` and rename to `send-sms.js`
- **Custom Backend**: Host on your own Express/Node server

### 6. For Local Development

If running locally, you'll need to set up a local server to handle the `/api/send-sms` endpoint or use a tool like `ngrok` to tunnel to your local API.

Alternatively, you can use Vercel CLI for local development:

```bash
npm install -g vercel
vercel dev
```

## Usage

Once configured, click the "Send Reminder" button in the appointment details dialog to send:
- A reminder to yourself about the appointment
- A reminder to the customer about their appointment

## Important Notes

- **Phone Number Format**: Use E.164 format (e.g., +1234567890)
- **Customer Phone Validation**: Ensure customer phone numbers are stored in the correct format
- **Twilio Trial**: Trial accounts can only send to verified phone numbers
- **Costs**: Check Twilio pricing for SMS costs in your region

## Troubleshooting

- **"Failed to send reminders"**: Check that your Twilio credentials are correct
- **No SMS received**: Verify phone numbers are in E.164 format (+1234567890)
- **Trial account restrictions**: Add recipient numbers to verified caller IDs in Twilio console
