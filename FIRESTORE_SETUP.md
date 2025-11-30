# Firestore Security Rules Setup

## Important: Deploy Security Rules

The file `firestore.rules` contains the security rules for Firestore. You **MUST** deploy these rules to Firebase for the admin functionality to work properly.

### How to Deploy:

1. **Using Firebase Console:**
   - Go to Firebase Console → Firestore Database → Rules
   - Copy the contents of `firestore.rules`
   - Paste into the rules editor
   - Click "Publish"

2. **Using Firebase CLI:**
   ```bash
   firebase deploy --only firestore:rules
   ```

## What the Rules Do:

- **Users can read/update their own documents** (except `isAdmin` and `role` fields)
- **Admin users (with `isAdmin: true`) can read/write all user documents**
- **Prevents non-admin users from modifying admin privileges**

## Current Issue:

If you're seeing "Missing or insufficient permissions" errors, it means:
1. The security rules haven't been deployed yet, OR
2. The user document doesn't have `isAdmin: true` set

The code now automatically sets `isAdmin: true` for `lc@ne.ai` on login, but you still need to deploy the security rules for full functionality.


