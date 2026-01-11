import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tempapp.app',
  appName: 'ChickMain',
  webDir: 'public',
  server: {
    url: 'http://192.168.139.54:3000', // LAN IP - Works on Emulator & Physical Device
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
