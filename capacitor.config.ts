import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.contractorscrm.app',
  appName: "Cliently",
  webDir: 'dist',
  server: {
    // For development, point to your local backend
    // androidScheme: 'https'
  }
};

export default config;
