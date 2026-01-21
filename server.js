import express from "express";
import cors from "cors";
import { Vonage } from "@vonage/server-sdk";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import cron from "node-cron";
import { createClient } from "@supabase/supabase-js";
import rateLimit from "express-rate-limit";
import { parsePhoneNumber } from "libphonenumber-js";
import Joi from "joi";

// Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env
config({ path: join(__dirname, ".env.local") });

// Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseService = createClient(
  supabaseUrl,
  process.env.VITE_SUPABASE_SERVICE_KEY || supabaseKey
);

// Reminder cache: { sent24: boolean, sent1: boolean }
const reminderSendCache = new Map();

// SMS schema
const smsSchema = Joi.object({
  to: Joi.string()
    .required()
    .custom((value, helpers) => {
      try {
        const parsed = parsePhoneNumber(value, "US");
        if (!parsed || !parsed.isValid()) return helpers.error("Invalid phone number");
      } catch (err) {
        return helpers.error("Invalid phone number format");
      }
      return value;
    }),
  message: Joi.string().max(160).required().messages({
    "string.max": "Message cannot exceed 160 characters",
  }),
});

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === "development",
});

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  skipSuccessfulRequests: true,
});

const smsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// Helpers
function formatUSPhoneNumber(phone) {
  if (!phone) return phone;
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith("1")) return `+${cleaned}`;
  if (phone.startsWith("+")) return phone;
  return `+${cleaned}`;
}

async function authenticateRequest(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing or invalid authorization header" });
  }
  const token = authHeader.replace("Bearer ", "");
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: "Unauthorized: Invalid token" });
    req.user = user;
    next();
  } catch (err) {
    console.error("Authentication error:", err);
    return res.status(401).json({ error: "Unauthorized: Authentication failed" });
  }
}

async function getOwnerPhone() {
  try {
    const { data, error } = await supabase
      .from("settings")
      .select("owner_phone")
      .single();
    if (error || !data?.owner_phone) {
      console.log(" No owner phone in database, using default: 19417633317");
      return "19417633317";
    }
    return data.owner_phone;
  } catch (err) {
    console.error("Error fetching owner phone:", err);
    return "19417633317";
  }
}

async function sendVonageSMS(to, message) {
  const vonageApiKey = process.env.VONAGE_API_KEY;
  const vonageApiSecret = process.env.VONAGE_API_SECRET;
  const vonageFromNumber = process.env.VONAGE_FROM_NUMBER;

  if (!vonageApiKey || !vonageApiSecret || !vonageFromNumber) {
    console.error("Missing Vonage credentials");
    return { success: false, error: "Missing Vonage credentials" };
  }

  try {
    const vonage = new Vonage({ apiKey: vonageApiKey, apiSecret: vonageApiSecret });
    const result = await vonage.sms.send({ to, from: vonageFromNumber, text: message });
    if (result.messages && result.messages[0]) {
      const msg = result.messages[0];
      if (msg.status === "0") {
        console.log(" SMS sent successfully");
        return { success: true, result };
      }
      console.error(` SMS failed - Status: ${msg.status}`);
      return { success: false, error: msg["error-text"] || "SMS failed" };
    }
    return { success: true, result };
  } catch (error) {
    console.error(" Vonage error:", error.message);
    return { success: false, error: error.message };
  }
}

// Express app
const app = express();

// Enforce HTTPS in production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    if (!req.secure && req.get("x-forwarded-proto") !== "https") {
      return res.redirect(301, `https://${req.get("host")}${req.url}`);
    }
  }
  next();
});

// Security headers
app.use((_, res, next) => {
  res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  res.set("X-XSS-Protection", "1; mode=block");
  next();
});

// CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:5173").split(",");
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());
app.use((req, _res, next) => { console.log(`${req.method} ${req.path}`); next(); });

// Resolve dist directory (Render builds to project root, not src)
const distDir = join(__dirname, "..", "dist");
// Serve static files from dist folder
app.use(express.static(distDir));

// SMS endpoint
app.post("/api/send-sms", smsLimiter, authenticateRequest, async (req, res) => {
  const { error, value } = smsSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  let { to, message } = value;
  if (!to || !message) return res.status(400).json({ error: "Missing required fields: to, message" });

  to = formatUSPhoneNumber(to);
  const result = await sendVonageSMS(to, message);
  if (!result.success) return res.status(500).json({ error: result.error || "Failed to send SMS" });

  return res.status(200).json({ success: true });
});

// Serve static files from dist folder (redundant in case of middleware order)
app.use(express.static(distDir));

// SPA fallback - serve index.html for any unmatched routes
app.use((req, res) => {
  res.sendFile(join(distDir, "index.html"));
});

// Reminder checker
async function checkAndSendReminders() {
  console.log(" Checking for appointments to remind...");

  const now = new Date();
  const fetchEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  const ONE_HOUR = 60 * 60 * 1000;
  const TOLERANCE_24H = 30 * 60 * 1000; // 30m
  const TOLERANCE_1H = 15 * 60 * 1000;  // 15m

  try {
    const { data: appointments, error } = await supabaseService.from("appointments")
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
      .gte("start_time", now.toISOString())
      .lte("start_time", fetchEnd.toISOString());

    if (error) {
      console.error("Error fetching appointments:", error);
      return;
    }

    if (!appointments || appointments.length === 0) {
      console.log("No appointments found in the next 25 hours.");
      return;
    }

    console.log(` Found ${appointments.length} appointment(s) to evaluate.`);

    for (const appt of appointments) {
      const customer = appt.customers;
      const startTime = new Date(appt.start_time);
      const msUntilStart = startTime.getTime() - now.getTime();

      const cacheEntry = reminderSendCache.get(appt.id) || { sent24: false, sent1: false };
      const in24hWindow = Math.abs(msUntilStart - TWENTY_FOUR_HOURS) <= TOLERANCE_24H;
      const in1hWindow = Math.abs(msUntilStart - ONE_HOUR) <= TOLERANCE_1H;

      let sendType = null;
      if (in24hWindow && !cacheEntry.sent24) sendType = "24h";
      else if (in1hWindow && !cacheEntry.sent1) sendType = "1h";

      if (!sendType) {
        console.log(`  Skipping ${appt.id} (outside windows or already sent).`);
        continue;
      }

      const formattedDate = startTime.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const formattedTime = startTime.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const windowLabel = sendType === "24h" ? "24 hours" : "1 hour";

      const ownerMessage = `Reminder (${windowLabel} before): Appointment with ${customer?.full_name || "Unknown Customer"} on ${formattedDate} at ${formattedTime}. Location: ${customer?.address || "No address"}`;
      let customerMessage = `Hi ${customer?.full_name || "there"}! This is a reminder (${windowLabel} before) about your appointment on ${formattedDate} at ${formattedTime}.`;
      if (customer?.address) customerMessage += ` Location: ${customer.address}`;
      customerMessage += " See you then!";

      const ownerPhone = await getOwnerPhone();
      await sendVonageSMS(ownerPhone, ownerMessage);

      if (customer?.phone && customer?.pipeline_stage === "Appointment Scheduled") {
        await sendVonageSMS(customer.phone, customerMessage);
        console.log(` Sent reminder to customer: ${customer?.full_name}`);
      } else if (customer?.pipeline_stage !== "Appointment Scheduled") {
        console.log(` Customer ${customer?.full_name} is not in "Appointment Scheduled" status. Only owner notified.`);
      } else {
        console.log(` No phone number for customer: ${customer?.full_name}`);
      }

      reminderSendCache.set(appt.id, {
        sent24: cacheEntry.sent24 || sendType === "24h",
        sent1: cacheEntry.sent1 || sendType === "1h",
      });

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log(" Reminder pass complete.");
  } catch (error) {
    console.error("Error in reminder system:", error);
  }
}

// Cron every minute
cron.schedule("* * * * *", () => {
  console.log(" Running scheduled reminder check...");
  checkAndSendReminders();
});

// Run on startup
console.log(" Reminder system initialized. Checking for appointments...");
checkAndSendReminders();

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
