# Deploy Firestore Security Rules

## ⚠️ IMPORTANT: You MUST deploy these rules to Firebase!

The permission errors (`Missing or insufficient permissions`) you're seeing are because the Firestore security rules haven't been deployed yet.

**The rules file exists locally but needs to be deployed to Firebase Console.**

## Method 1: Using Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **intjchat**
3. Go to **Firestore Database** → **Rules** tab
4. Copy the entire contents of `firestore.rules` file
5. Paste into the rules editor
6. Click **Publish**

## Method 2: Using Firebase CLI

1. Install Firebase CLI if you haven't:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project (if not already done):
   ```bash
   firebase init firestore
   ```
   - Select your project: **intjchat**
   - Use existing rules file: **firestore.rules**

4. Deploy the rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

## What These Rules Do:

- ✅ **Users can read/update their own document** (except `isAdmin` and `role` fields)
- ✅ **Admin users (with `isAdmin: true`) can read/write ALL user documents**
- ✅ **All authenticated users can create their own user document**
- ✅ **Admin can create any user document**

## After Deploying:

1. **Sign out and sign back in** with `lc@ne.ai` / `123123`
2. This ensures the user's authentication token is refreshed
3. The admin dashboard should now work properly

## Quick Test (Temporary)

If you want to test quickly, you can temporarily use the test rules:

1. Copy contents of `firestore.rules.test` 
2. Paste into Firebase Console → Firestore Database → Rules
3. Click Publish
4. **⚠️ Remember to switch back to `firestore.rules` for production!**

## Troubleshooting:

If you still get permission errors after deploying:

1. **Check that the user document has `isAdmin: true`**:
   - Go to Firestore Database → `users` collection
   - Find the document with email `lc@ne.ai` (or the UID from Firebase Auth)
   - Verify `isAdmin` field is set to `true` (boolean, not string "true")
   - If missing, manually add: `isAdmin: true` and `role: "admin"`

2. **Verify rules are deployed**:
   - Go to Firestore Database → Rules tab
   - Check that the rules match the `firestore.rules` file
   - Look for the `isAdmin()` helper function

3. **Sign out and sign back in**:
   - This refreshes the authentication token
   - The admin privileges should be recognized

4. **Check browser console**:
   - Look for detailed error messages
   - The code now logs helpful debugging information

5. **Verify Firebase Auth user exists**:
   - Go to Firebase Console → Authentication
   - Ensure `lc@ne.ai` user exists
   - The Firestore document UID should match the Auth UID

