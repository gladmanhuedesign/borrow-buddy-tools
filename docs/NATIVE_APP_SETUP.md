# Native App Setup Guide
# BorrowBuddy Mobile (iOS & Android)

## Overview

This guide covers setting up BorrowBuddy as a native mobile app using Capacitor 6.

## Prerequisites

- Node.js 18+ installed
- Git installed
- For iOS: macOS with Xcode 14+
- For Android: Android Studio installed
- BorrowBuddy project exported to GitHub

## Installation Steps

### 1. Clone and Setup

```bash
git clone <your-github-repo>
cd borrow-buddy-tools
npm install
```

### 2. Install Capacitor

```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
```

### 3. Initialize Capacitor

```bash
npx cap init
```

Use these values:
- App ID: `app.lovable.848920849a3a4aa586c22c3699081a27`
- App Name: `BorrowBuddy`

### 4. Configure capacitor.config.ts

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.848920849a3a4aa586c22c3699081a27',
  appName: 'BorrowBuddy',
  webDir: 'dist',
  server: {
    url: 'https://84892084-9a3a-4aa5-86c2-2c3699081a27.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Camera: {
      permissions: ['camera', 'photos']
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
```

### 5. Build Web Assets

```bash
npm run build
```

### 6. Add Platforms

```bash
npx cap add ios
npx cap add android
```

### 7. Sync Project

```bash
npx cap sync
```

## Platform-Specific Setup

### iOS Setup

1. Open Xcode:
```bash
npx cap open ios
```

2. Configure signing in Xcode:
   - Select project in navigator
   - Go to Signing & Capabilities
   - Select your team
   - Configure bundle identifier

3. Add camera permissions to Info.plist:
```xml
<key>NSCameraUsageDescription</key>
<string>Take photos of tools to add them quickly</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Choose tool photos from your library</string>
```

4. Run on device/simulator:
```bash
npx cap run ios
```

### Android Setup

1. Open Android Studio:
```bash
npx cap open android
```

2. Configure AndroidManifest.xml permissions:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
```

3. Update build.gradle for min SDK:
```gradle
minSdkVersion 22
targetSdkVersion 34
```

4. Run on device/emulator:
```bash
npx cap run android
```

## Required Plugins

### Install Camera Plugin
```bash
npm install @capacitor/camera
```

### Install Push Notifications
```bash
npm install @capacitor/push-notifications
```

### Install Preferences
```bash
npm install @capacitor/preferences
```

## Development Workflow

1. Make changes in web code
2. Build: `npm run build`
3. Sync: `npx cap sync`
4. Run: `npx cap run ios` or `npx cap run android`

## Production Build

### iOS Production

1. Archive in Xcode
2. Upload to App Store Connect
3. Submit for review

### Android Production

1. Generate signed APK/Bundle in Android Studio
2. Upload to Google Play Console
3. Submit for review

## Testing Checklist

- [ ] Camera integration works
- [ ] Push notifications work
- [ ] Image upload works
- [ ] Offline mode shows cached data
- [ ] Deep links work
- [ ] Biometric auth works (if implemented)

## Environment Variables

Create `.env.production`:
```
VITE_SUPABASE_URL=https://wpmelbovrxfyrckhwonf.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_key_here
```

## Resources

- [Capacitor Docs](https://capacitorjs.com/)
- [iOS App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Guidelines](https://play.google.com/about/developer-content-policy/)
