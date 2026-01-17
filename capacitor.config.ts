import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tempapp.app',
  appName: 'ChickMain',
  webDir: 'public',
  server: {
    url: 'emp-mgmt-rho.vercel.app', // LAN IP - Works on Emulator & Physical Device
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
