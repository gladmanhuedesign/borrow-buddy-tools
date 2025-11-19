import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.848920849a3a4aa586c22c3699081a27',
  appName: 'borrow-buddy-tools',
  webDir: 'dist',
  server: {
    url: 'https://84892084-9a3a-4aa5-86c2-2c3699081a27.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;
