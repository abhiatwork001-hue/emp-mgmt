import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tempapp.app',
  appName: 'ChickMain',
  webDir: 'public',
  server: {
    url: 'https://localhost:3000', // CHANGE THIS TO YOUR LIVE URL IN PRODUCTION
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
