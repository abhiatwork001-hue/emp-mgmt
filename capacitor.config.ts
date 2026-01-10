import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tempapp.app',
  appName: 'ChickMain',
  webDir: 'public',
  server: {
    url: 'http://localhost:3000', // CHANGE THIS TO YOUR LIVE URL IN PRODUCTION
    cleartext: true
  }
};

export default config;
