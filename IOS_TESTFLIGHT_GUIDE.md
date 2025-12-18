# iOS App & Push Notifications Setup Guide

This guide covers setting up push notifications and deploying the NE Dating app to TestFlight.

## Prerequisites

- macOS with Xcode installed (latest version recommended)
- Apple Developer Account ($99/year)
- Firebase project with Cloud Messaging enabled
- CocoaPods installed: `sudo gem install cocoapods`

## Part 1: Firebase Cloud Messaging Setup

### 1.1 Generate VAPID Key (for Web Push)

1. Go to Firebase Console > Project Settings > Cloud Messaging
2. Under "Web configuration", click "Generate key pair"
3. Copy the VAPID key
4. Update `services/notifications.ts`:
   ```typescript
   const VAPID_KEY = 'YOUR_VAPID_KEY_HERE'; // Replace with your actual key
   ```

### 1.2 Configure iOS APNs

1. **Create APNs Authentication Key:**
   - Go to [Apple Developer Portal](https://developer.apple.com/account/resources/authkeys/list)
   - Click "+" to create a new key
   - Enable "Apple Push Notifications service (APNs)"
   - Download the `.p8` file
   - Note the Key ID

2. **Upload APNs Key to Firebase:**
   - Go to Firebase Console > Project Settings > Cloud Messaging > iOS app configuration
   - Upload the `.p8` file
   - Enter the Key ID and Team ID (found in Apple Developer Portal)

### 1.3 Deploy Cloud Functions

Deploy the notification cloud functions:

```bash
cd functions
npm install
npm run deploy
```

Or use the deploy script:
```bash
bash scripts/deploy-functions.sh
```

## Part 2: iOS App Configuration

### 2.1 Build and Sync

Build the web app and sync with Capacitor:

```bash
npm run build
npx cap sync ios
```

### 2.2 Open Xcode

```bash
npm run cap:open:ios
# or
npx cap open ios
```

### 2.3 Configure App in Xcode

1. **Select the App target** (App in the left sidebar)
2. **General tab:**
   - Update Display Name: "NE Dating"
   - Bundle Identifier: `com.nedating.app` (must match Apple Developer Portal)
   - Version: e.g., 1.0.0
   - Build: e.g., 1

3. **Signing & Capabilities:**
   - Select your Team
   - Enable "Automatically manage signing"
   - Add Capability: "Push Notifications"
   - Add Capability: "Background Modes"
     - Check "Remote notifications"

4. **Info tab:**
   - Add `NSCameraUsageDescription`: "This app needs camera access to take photos for your profile"
   - Add `NSPhotoLibraryUsageDescription`: "This app needs photo library access to choose photos"
   - Add `NSPhotoLibraryAddUsageDescription`: "This app needs permission to save photos"

### 2.4 Update App Icon and Launch Screen

1. **App Icon:**
   - Create app icons using [App Icon Generator](https://www.appicon.co/)
   - Drag icons to `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

2. **Launch Screen:**
   - Edit `ios/App/App/Base.lproj/LaunchScreen.storyboard` in Xcode
   - Or create a custom launch screen

### 2.5 Build for iOS Device

1. Select a physical iOS device or "Any iOS Device (arm64)"
2. Product > Archive
3. Wait for the archive to complete

## Part 3: TestFlight Deployment

### 3.1 App Store Connect Setup

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Click "My Apps" > "+" > "New App"
3. Fill in:
   - Platform: iOS
   - Name: NE Dating
   - Primary Language: English
   - Bundle ID: com.nedating.app (select from dropdown)
   - SKU: unique identifier (e.g., nedating-001)

### 3.2 Upload Build

After archiving in Xcode:

1. In Xcode Organizer (Window > Organizer)
2. Select the archive
3. Click "Distribute App"
4. Choose "App Store Connect"
5. Upload
6. Wait for processing (10-30 minutes)

### 3.3 TestFlight Configuration

1. In App Store Connect > TestFlight
2. Click on the build (once processing is complete)
3. Add "What to Test" notes
4. Add internal testers (up to 100 users)
5. Or add external testers (requires App Review)

### 3.4 Export Compliance

When prompted about encryption:
- If your app only uses HTTPS: Select "No"
- Otherwise, follow the export compliance wizard

## Part 4: Testing Push Notifications

### 4.1 Test on Physical Device

1. Install the TestFlight app from App Store
2. Accept the TestFlight invitation
3. Install NE Dating from TestFlight
4. Log in and grant notification permissions

### 4.2 Send Test Notification

Use Firebase Console to send a test notification:

1. Go to Firebase Console > Cloud Messaging
2. Click "Send your first message"
3. Enter notification text
4. Target: Select your app
5. Send test message
6. Enter your FCM token (check console logs in Xcode)

### 4.3 Verify Cloud Functions

Test message notifications by sending a message in the app. Check:
- Firebase Console > Functions > Logs
- Xcode device logs
- Notification should appear when app is in background

## Part 5: Updating the App

### 5.1 Make Changes

1. Update your web code
2. Increment version/build number in Xcode
3. Build and sync:
   ```bash
   npm run build
   npx cap sync ios
   ```

### 5.2 Archive and Upload

1. Open Xcode: `npm run cap:open:ios`
2. Product > Archive
3. Distribute to App Store Connect
4. New build will appear in TestFlight

## Part 6: Production Release

### 6.1 Prepare App Store Listing

In App Store Connect:

1. **App Information:**
   - Subtitle
   - Privacy Policy URL
   - Category: Social Networking

2. **Pricing and Availability:**
   - Free
   - Select countries

3. **App Privacy:**
   - Complete privacy questionnaire
   - Declare data collection practices

4. **Screenshots:**
   - Required for different device sizes
   - Use [Screenshots.pro](https://screenshots.pro/) or similar

5. **App Review Information:**
   - Contact info
   - Demo account credentials (if needed)
   - Notes for reviewer

### 6.2 Submit for Review

1. Select a TestFlight build
2. Click "Submit for Review"
3. Wait for Apple's review (1-3 days typically)

## Part 7: Troubleshooting

### Common Issues

**Issue: Push notifications not working**
- Check APNs certificate is uploaded to Firebase
- Verify Push Notifications capability is enabled
- Check FCM token is being saved to Firestore
- Review Cloud Function logs

**Issue: Archive fails**
- Clean build folder: Product > Clean Build Folder
- Update pods: `cd ios/App && pod install`
- Check code signing settings

**Issue: App crashes on launch**
- Check Xcode console for errors
- Verify all required permissions are in Info.plist
- Review capacitor.config.ts settings

**Issue: Build not appearing in TestFlight**
- Wait for processing (can take 30+ minutes)
- Check email for compliance/error notifications
- Verify bundle ID matches App Store Connect

### Debug Commands

```bash
# View iOS device logs
xcrun simctl spawn booted log stream --predicate 'processImagePath contains "App"'

# Clean Capacitor
npx cap sync ios --force

# Rebuild node modules
rm -rf node_modules package-lock.json
npm install
```

## Part 8: Monitoring & Analytics

### Firebase Analytics

The app automatically tracks:
- Screen views
- User engagement
- Custom events

View in Firebase Console > Analytics

### Crash Reporting

Consider adding Firebase Crashlytics:
```bash
npm install @capacitor-firebase/crashlytics
```

### Push Notification Analytics

Monitor in Firebase Console > Cloud Messaging:
- Delivery rates
- Open rates
- Conversion tracking

## Part 9: Required Files Checklist

✅ Created files:
- `capacitor.config.ts` - Capacitor configuration
- `services/notifications.ts` - Notification service
- `hooks/useNotifications.ts` - React hook for notifications
- `public/firebase-messaging-sw.js` - Service worker for web push
- `functions/src/index.ts` - Updated with notification functions

✅ Modified files:
- `App.tsx` - Added notification initialization
- `services/firebase.ts` - Added messaging support
- `package.json` - Added Capacitor scripts

✅ Generated folders:
- `ios/` - Native iOS project

## Part 10: Best Practices

### Security
- Never commit `.p8` files to version control
- Use environment variables for sensitive keys
- Regularly rotate APNs keys

### Performance
- Test on real devices, not just simulator
- Monitor app size and load times
- Optimize images and assets

### User Experience
- Request notification permission at the right time (after login)
- Provide clear value proposition for notifications
- Allow users to configure notification preferences

### Maintenance
- Keep dependencies updated
- Test on latest iOS versions
- Monitor crash reports and user feedback

## Support Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)

## Next Steps

1. ✅ Complete Firebase setup (VAPID key, APNs)
2. ✅ Build and archive in Xcode
3. ✅ Upload to TestFlight
4. ✅ Test notifications
5. ✅ Prepare App Store listing
6. ✅ Submit for review
7. ✅ Launch! 🚀
