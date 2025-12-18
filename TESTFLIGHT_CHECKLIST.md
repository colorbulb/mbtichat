# 🚀 TestFlight Deployment Checklist

Use this checklist to ensure you complete all steps for deploying to TestFlight with push notifications.

## Phase 1: Firebase Configuration ⚙️

### Firebase Cloud Messaging Setup
- [ ] Go to Firebase Console → Project Settings → Cloud Messaging
- [ ] Generate VAPID key for web push
- [ ] Copy VAPID key to `services/notifications.ts`
- [ ] Save changes and commit

### Apple Push Notification Service (APNs)
- [ ] Go to [Apple Developer Portal](https://developer.apple.com/account/resources/authkeys/list)
- [ ] Create new APNs Authentication Key
- [ ] Download `.p8` file (save securely!)
- [ ] Note the Key ID
- [ ] Note your Team ID
- [ ] Go to Firebase Console → Project Settings → Cloud Messaging
- [ ] Upload `.p8` file to iOS app configuration
- [ ] Enter Key ID and Team ID
- [ ] Save configuration

### Cloud Functions Deployment
- [ ] Navigate to functions directory: `cd functions`
- [ ] Install dependencies: `npm install`
- [ ] Build functions: `npm run build`
- [ ] Deploy to Firebase: `firebase deploy --only functions`
- [ ] Verify deployment in Firebase Console → Functions
- [ ] Check that `sendMessageNotification` and `sendActivityNotification` are deployed

## Phase 2: Apple Developer Account Setup 🍎

### App ID Registration
- [ ] Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list)
- [ ] Click "+" to register new App ID
- [ ] Select "App IDs" → "App"
- [ ] Description: "NE Dating"
- [ ] Bundle ID: `com.nedating.app` (Explicit)
- [ ] Enable "Push Notifications" capability
- [ ] Register and save

### App Store Connect Setup
- [ ] Go to [App Store Connect](https://appstoreconnect.apple.com/)
- [ ] My Apps → "+" → New App
- [ ] Platform: iOS
- [ ] Name: NE Dating (or your preferred name)
- [ ] Primary Language: English (or your choice)
- [ ] Bundle ID: Select `com.nedating.app`
- [ ] SKU: nedating-001 (or unique identifier)
- [ ] User Access: Full Access
- [ ] Create app

## Phase 3: Local Development Setup 💻

### Prerequisites Check
- [ ] macOS with Xcode installed (latest version)
- [ ] Xcode Command Line Tools installed
- [ ] CocoaPods installed: `sudo gem install cocoapods`
- [ ] Node.js and npm installed
- [ ] Apple Developer account with paid membership

### Project Build
- [ ] Navigate to project: `cd /Users/louisc/Desktop/mbtichat2`
- [ ] Install dependencies: `npm install`
- [ ] Build web app: `npm run build`
- [ ] Sync with iOS: `npx cap sync ios`
- [ ] Verify no errors in output

## Phase 4: Xcode Configuration 🔧

### Open Project
- [ ] Run: `npm run cap:open:ios`
- [ ] Wait for Xcode to open
- [ ] Wait for indexing to complete

### General Settings
- [ ] Select "App" target in left sidebar
- [ ] General tab:
  - [ ] Display Name: "NE Dating"
  - [ ] Bundle Identifier: `com.nedating.app`
  - [ ] Version: 1.0.0
  - [ ] Build: 1
  - [ ] Minimum Deployments: iOS 13.0 or higher

### Signing & Capabilities
- [ ] Signing & Capabilities tab
- [ ] Signing section:
  - [ ] Automatically manage signing: ✓
  - [ ] Team: Select your team
  - [ ] Provisioning Profile: Automatic
- [ ] Click "+" to add capability
- [ ] Add "Push Notifications"
- [ ] Add "Background Modes"
  - [ ] Check "Remote notifications"

### Info.plist Permissions
- [ ] Info tab → Custom iOS Target Properties
- [ ] Add these keys (click "+" button):
  - [ ] Privacy - Camera Usage Description
    - Value: "This app needs camera access to take photos for your profile"
  - [ ] Privacy - Photo Library Usage Description  
    - Value: "This app needs photo library access to choose photos"
  - [ ] Privacy - Photo Library Additions Usage Description
    - Value: "This app needs permission to save photos"

### App Icons (Optional but Recommended)
- [ ] Create app icons using [appicon.co](https://www.appicon.co/)
- [ ] Drag icons to Assets.xcassets → AppIcon
- [ ] Ensure all required sizes are included

## Phase 5: Build and Archive 📦

### Connect Device or Select Target
- [ ] Connect physical iOS device via USB
- [ ] Trust computer on device if prompted
- [ ] Or select "Any iOS Device (arm64)" from target dropdown

### Archive
- [ ] Product → Clean Build Folder (Shift+Cmd+K)
- [ ] Product → Archive (Cmd+B then wait)
- [ ] Wait for archiving to complete (can take 5-10 minutes)
- [ ] Verify archive appears in Organizer

## Phase 6: TestFlight Upload 📤

### Distribute App
- [ ] Window → Organizer (if not already open)
- [ ] Select the archive
- [ ] Click "Distribute App"
- [ ] Select "App Store Connect"
- [ ] Upload
- [ ] Select "Include bitcode for iOS content" (optional)
- [ ] Automatically manage signing
- [ ] Review App information
- [ ] Export Compliance:
  - [ ] Select "No" if only using HTTPS
  - [ ] Or complete questionnaire if needed
- [ ] Upload

### Wait for Processing
- [ ] Check email for upload confirmation
- [ ] Go to App Store Connect → TestFlight
- [ ] Wait for build to appear (10-30 minutes)
- [ ] Wait for "Processing" to complete
- [ ] Status should change to "Testing" or "Ready to Submit"

## Phase 7: TestFlight Configuration 🧪

### Build Settings
- [ ] Select the build in TestFlight tab
- [ ] Test Information:
  - [ ] What to Test: Describe new features/fixes
  - [ ] Add test notes for testers
- [ ] Export Compliance: Complete if not done during upload

### Add Testers
- [ ] Internal Testing:
  - [ ] Add App Store Connect users
  - [ ] Up to 100 internal testers
  - [ ] No review needed
- [ ] External Testing (optional):
  - [ ] Create test group
  - [ ] Add testers by email
  - [ ] Requires Beta App Review (1-2 days)

### Enable Build
- [ ] Toggle build to "Enable for testing"
- [ ] Testers receive email invitation
- [ ] Confirm invitations sent

## Phase 8: Test Push Notifications 🔔

### Install and Test
- [ ] Install TestFlight app from App Store on device
- [ ] Accept invitation email
- [ ] Install NE Dating from TestFlight
- [ ] Open app and log in
- [ ] Grant notification permission when prompted
- [ ] Verify FCM token saved (check Firestore console)

### Test Message Notifications
- [ ] Send message from another account
- [ ] Lock device or background app
- [ ] Verify notification appears
- [ ] Tap notification
- [ ] Verify app opens to correct chat

### Test from Firebase Console
- [ ] Firebase Console → Cloud Messaging
- [ ] Click "Send test message"
- [ ] Enter notification title and body
- [ ] Add FCM token from device logs
- [ ] Send and verify receipt

## Phase 9: Production Preparation 🌟

### App Store Listing
- [ ] App Store Connect → My Apps → NE Dating
- [ ] App Information:
  - [ ] Subtitle (30 chars)
  - [ ] Privacy Policy URL
  - [ ] Category: Social Networking
- [ ] Pricing and Availability:
  - [ ] Price: Free
  - [ ] Available Countries
- [ ] Prepare for Submission:
  - [ ] Screenshots (required sizes)
  - [ ] App Preview videos (optional)
  - [ ] Promotional Text
  - [ ] Description
  - [ ] Keywords
  - [ ] Support URL
  - [ ] Marketing URL (optional)

### App Privacy
- [ ] Complete Privacy Questionnaire
- [ ] Declare data collection:
  - [ ] Contact Info (email)
  - [ ] User Content (messages, photos)
  - [ ] Identifiers (device ID for push notifications)
- [ ] Link data to user
- [ ] Used for app functionality

### App Review Information
- [ ] Contact Information (email, phone)
- [ ] Demo Account:
  - [ ] Username
  - [ ] Password
  - [ ] Instructions if needed
- [ ] Notes for Reviewer
- [ ] Attach screenshots if helpful

## Phase 10: Submit for Review 📝

### Final Review
- [ ] All metadata complete
- [ ] Screenshots uploaded
- [ ] Privacy questionnaire filled
- [ ] Build selected
- [ ] Age rating appropriate
- [ ] Review information complete

### Submit
- [ ] Click "Submit for Review"
- [ ] Confirm submission
- [ ] Monitor status in App Store Connect
- [ ] Respond to any questions from Apple
- [ ] Typical review time: 24-48 hours

## Phase 11: Post-Launch Monitoring 📊

### After Approval
- [ ] App appears in App Store
- [ ] Test download and install
- [ ] Monitor reviews and ratings
- [ ] Check Firebase Analytics
- [ ] Monitor Crashlytics (if enabled)

### Ongoing Maintenance
- [ ] Monitor cloud function costs
- [ ] Check notification delivery rates
- [ ] Review user feedback
- [ ] Plan updates and improvements

## 🆘 Troubleshooting

### Build Errors
- [ ] Clean build folder: Product → Clean Build Folder
- [ ] Update pods: `cd ios/App && pod install`
- [ ] Delete derived data
- [ ] Restart Xcode

### Notification Issues
- [ ] Verify APNs key uploaded to Firebase
- [ ] Check Push Notifications capability enabled
- [ ] Review cloud function logs
- [ ] Check FCM token saved in Firestore
- [ ] Test on real device (not simulator)

### Upload Issues
- [ ] Verify signing is configured correctly
- [ ] Check Bundle ID matches App Store Connect
- [ ] Ensure all capabilities are enabled
- [ ] Review upload logs in Xcode

## 📞 Support Resources

- **Apple Developer Support:** developer.apple.com/support
- **Firebase Support:** firebase.google.com/support
- **Capacitor Docs:** capacitorjs.com/docs
- **Stack Overflow:** Tag questions with [ios], [push-notification], [capacitor]

## ✅ Success Criteria

- [ ] App installs from TestFlight
- [ ] User can log in successfully
- [ ] Notifications permission requested and granted
- [ ] Message notifications delivered
- [ ] Tapping notification opens correct screen
- [ ] Background notifications work
- [ ] No crashes or major bugs
- [ ] Ready for App Store submission

---

**Created:** December 9, 2025
**Last Updated:** December 9, 2025
**Status:** Ready for deployment

**Estimated Time to Complete:** 2-4 hours (first time), 30-60 minutes (subsequent builds)

**Good luck with your launch! 🚀**
