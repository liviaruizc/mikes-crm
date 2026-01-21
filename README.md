# CRM

A comprehensive Customer Relationship Management system built for service-based businesses. Track customers, manage appointments, visualize locations on an interactive map, and monitor your sales pipeline.

## Features

### 📊 Dashboard (Home Page)
- Quick action buttons for creating customers and scheduling appointments
- Today's schedule with appointment details
- Interactive customer location map with toggle between all customers and today's appointments
- Click appointments to view full details with options to call, email, or cancel

### 👥 Customer Management
- Full CRUD operations for customer records
- **Address Autocomplete** - Smart address search powered by Google Places API
  - Start typing an address to get instant suggestions
  - Automatically fills street, city, state, and zip code fields
  - Can still manually edit address fields if needed
- Customer details include:
  - Full name, phone, email
  - Separate address fields (street, city, state, zip)
  - Job type and estimated price
  - Pipeline stage tracking
  - Custom notes
- Phone numbers formatted as (XXX) XXX-XXXX
- Click-to-call and click-to-email functionality

### 📅 Calendar & Appointments
- Multiple view options (Month, Week, Day)
- Drag-and-drop appointment creation
- Full appointment details with customer information
- Appointment reminders via SMS (Twilio integration)
- Cancel appointments directly from the calendar
- Time slots from 7:00 AM to 10:00 PM
- Eastern Time (America/New_York) timezone support

### 🗺️ Interactive Map
- Visual display of all customer locations
- Color-coded pins by pipeline stage:
  - 🔵 New
  - 🟣 Contacted
  - 🟠 Appointment Scheduled
  - 🟢 Negotiation
  - ✅ Won
  - 🔴 Lost
- Customer name labels above each pin
- Filter customers by pipeline stage
- Geocoding powered by Nominatim (OpenStreetMap)
- Click markers for detailed customer information

### 📈 Pipeline Dashboard
- Kanban-style board for tracking deals
- Six pipeline stages with drag-and-drop functionality
- Visual deal cards with customer info and estimated value
- Move customers through the sales pipeline seamlessly

## Tech Stack

### Frontend
- **React 19** - UI library
- **TypeScript** - Type safety
- **Chakra UI v3** - Component library and styling
- **Vite** - Build tool and dev server
- **React Router** - Navigation

### Backend & Services
- **Supabase** - PostgreSQL database and authentication
- **Twilio** - SMS appointment reminders
- **Google Maps API** - Address autocomplete and location mapping
- **Nominatim API** - Free geocoding service (OpenStreetMap)

### Key Libraries
- **react-big-calendar** - Calendar component with multiple views
- **react-leaflet** - Interactive maps
- **moment-timezone** - Date/time handling with timezone support
- **@dnd-kit** - Drag and drop functionality for pipeline

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account
- Google Maps API key (for address autocomplete and maps)
- Twilio account (for SMS functionality)

## Environment Variables

Create a `.env` file in the root directory (you can use `.env.example` as a template):

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

**Note:** The `VITE_GOOGLE_MAPS_API_KEY` is required for:
- Address autocomplete in customer forms
- Map visualization features

To get a Google Maps API key:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the "Places API" and "Maps JavaScript API"
4. Create credentials (API Key)
5. Restrict the API key to your domain for security

## Database Setup

### Supabase Tables

**customers**
```sql
- id (uuid, primary key)
- full_name (text)
- phone (text)
- email (text)
- address (text)
- job_type (text)
- estimated_price (numeric)
- pipeline_stage (text)
- notes (text)
- created_at (timestamp)
```

**appointments**
```sql
- id (uuid, primary key)
- customer_id (uuid, foreign key to customers)
- title (text)
- description (text)
- start_time (timestamp)
- end_time (timestamp)
- created_at (timestamp)
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd boss-crm
```

2. Install dependencies:
```bash
npm install
```

3. Create and configure your `.env` file with the required credentials

4. Start the development server:
```bash
npm run dev
```

5. Open your browser to `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## SMS Server (Optional)

For SMS appointment reminders, start the Express server:

```bash
node server.js
```

The SMS server runs on port 3001 and requires Twilio toll-free verification to be completed.

## Usage

### Creating a Customer
1. Click "New Customer" on the home page or navigate to Customers
2. Fill in customer details with separate address fields
3. Select pipeline stage
4. Save to database

### Scheduling an Appointment
1. Click "New Appointment" or go to Calendar
2. Click a time slot on the calendar
3. Select customer, set time range, and add description
4. Appointment appears on calendar and today's schedule

### Viewing Customer Locations
1. Navigate to Map page from sidebar
2. Use filter checkboxes to show/hide pipeline stages
3. Click markers for customer details
4. Home page shows embedded map with toggle for today's appointments

### Managing Pipeline
1. Navigate to Pipeline page
2. Drag customer cards between stages
3. Pipeline stage automatically updates in database

## Key Features in Detail

### Address Handling
- Form has separate fields: Street, City, State, Zip Code
- Combined as "Street, City, State Zip" in database
- Automatically geocoded to latitude/longitude for map display

### Phone Number Formatting
- Stored in any format in database
- Displayed as (XXX) XXX-XXXX throughout the app
- Click to initiate phone call

### Time Zone Support
- All appointments stored in UTC
- Displayed in Eastern Time (America/New_York)
- Consistent timezone handling with moment-timezone

### Map Rate Limiting
- Nominatim API has 1 request per second limit
- Geocoding includes 1-second delays between requests
- Free service with no API key required

## Styling

- Dark theme with gold accents (#D4AF37)
- Responsive design for mobile and desktop
- Today's date highlighted in dark gray on calendar
- Consistent color coding across all views

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile responsive
- Requires JavaScript enabled

## Known Limitations

- SMS functionality requires Twilio toll-free verification completion
- Geocoding rate limited to 1 address per second
- Map requires valid addresses for customer display
- Pipeline dashboard currently being debugged

## Contributing

This is a private project. For questions or issues, contact the development team.

## License

Private - All rights reserved
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
