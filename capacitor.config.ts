import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tempapp.app',
  appName: 'ChickMain',
  webDir: 'public',
  server: {
    url: 'http://10.0.2.2:3000', // Android Emulator Localhost
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
