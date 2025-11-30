<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

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

## Features

- **User Authentication**: Firebase Auth with email/password
- **User Management**: Create, edit, delete users (admin only)
- **User Roles**: Users are created with role "user", admin has role "admin"
- **Admin User Creation**: Admin (lc@ne.ai) can create users that are linked to Firebase Authentication and have a Firestore document with role "user"
- **Firestore Integration**: All user data stored in Firestore
- **MBTI Chat**: Chat with translation using Gemini API
