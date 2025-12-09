import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.contractorscrm.app',
  appName: "Contractor's CRM",
  webDir: 'dist',
  server: {
    // For development, point to your local backend
    // androidScheme: 'https'
  }
};

export default config;
