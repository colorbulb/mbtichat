<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# mbtichat - MBTI Dating App

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1Of5yDmtYJRdzH_cOj4N69bUolY2kwH6S

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`

2. Firebase Configuration:
   - Firebase config is already set up in `services/firebase.ts`
   - Make sure Firebase Authentication (Email/Password) is enabled in Firebase Console
   - Make sure Firestore Database is enabled in Firebase Console

3. Gemini API:
   - Gemini API key is configured in `services/gemini.ts`

4. Create Admin User:
   - The admin user (lc@ne.ai / 123123) needs to be created in Firebase
   - Option 1: Create manually in Firebase Console (Authentication > Add User)
   - Option 2: Run the setup script in browser console:
     ```javascript
     import { setupAdminUser } from './services/setupAdmin';
     await setupAdminUser();
     ```
   - After creating the Auth user, the Firestore document will be created automatically on first login, or you can create it manually with:
     - Collection: `users`
     - Document ID: (the Firebase Auth UID)
     - Fields: username: "admin", email: "lc@ne.ai", isAdmin: true, role: "admin", birthDate: "1980-01-01", age: 44, gender: "Other", mbti: "ENTJ", bio: "System Administrator"

5. Run the app:
   `npm run dev`

6. Build for production:
   `npm run build`

## iOS App & TestFlight Deployment

**NEW:** This app now supports native iOS deployment with push notifications!

### Quick Start for iOS
```bash
# Build and open in Xcode
npm run ios:build

# Or step by step
npm run build          # Build web app
npx cap sync ios       # Sync with iOS
npm run cap:open:ios   # Open in Xcode
```

### Setup Guide
- **Complete Guide:** See `IOS_TESTFLIGHT_GUIDE.md` for detailed step-by-step instructions
- **Quick Reference:** See `PUSH_NOTIFICATIONS_QUICKSTART.md` for commands and tips
- **Checklist:** Use `TESTFLIGHT_CHECKLIST.md` to track your progress
- **Implementation Notes:** See `IMPLEMENTATION_NOTES.md` for technical details

### Prerequisites for iOS
1. macOS with Xcode installed
2. Apple Developer Account ($99/year)
3. Firebase Cloud Messaging configured with APNs
4. CocoaPods: `sudo gem install cocoapods`

### Helper Script
Run the setup helper script:
```bash
bash scripts/ios-setup.sh
```

## Features

- **User Authentication**: Firebase Auth with email/password
- **User Management**: Create, edit, delete users (admin only)
- **User Roles**: Users are created with role "user", admin has role "admin"
- **Admin User Creation**: Admin (lc@ne.ai) can create users that are linked to Firebase Authentication and have a Firestore document with role "user"
- **Push Notifications**: Real-time notifications for messages and activities (iOS & Web)
- **Native iOS App**: Full iOS app support via Capacitor
- **Background Notifications**: Receive notifications when app is closed
- **Firestore Integration**: All user data stored in Firestore
- **MBTI Chat**: Chat with translation using Gemini API
