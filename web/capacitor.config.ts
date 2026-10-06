import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fuelautopilot.app',
  appName: 'Fuel Autopilot',
  webDir: 'public',
  server: {
    url: 'https://fuel-expense-autopilot.vercel.app',
    cleartext: true,
    allowNavigation: ['fuel-expense-autopilot.vercel.app']
  }
};

export default config;
