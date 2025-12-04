import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mikerenovations.crm',
  appName: "Mike's CRM",
  webDir: 'dist',
  server: {
    // For development, point to your local backend
    // androidScheme: 'https'
  }
};

export default config;
