# Troubleshooting Guide

## Issue: Users Cannot See Other Users / Admin Cannot See User List

### Step 1: Deploy Firestore Rules (CRITICAL)

**This is the most common cause of the issue!**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **intjchat**
3. Navigate to: **Firestore Database** → **Rules** tab
4. Copy the **ENTIRE** contents of `firestore.rules` file
5. Paste into the rules editor
6. Click **Publish**
7. Wait for confirmation that rules are published

### Step 2: Verify Admin User Document

1. Go to Firebase Console → **Firestore Database** → **Data** tab
2. Open the `users` collection
3. Find the document for `lc@ne.ai` (the admin user)
4. Verify the document has:
   - `isAdmin: true` (boolean, not string "true")
   - `role: "admin"` (string)
   - `email: "lc@ne.ai"`

If `isAdmin` is missing or false:
- Manually set `isAdmin: true` in Firestore
- Or sign out and sign back in (the code should auto-fix it)

### Step 3: Verify Regular User Documents

1. Check that regular users have:
   - `isAdmin: false` or field doesn't exist
   - `visibleToUsers: true` or field doesn't exist (defaults to visible)
   - `role: "user"` or field doesn't exist

### Step 4: Test with Temporary Permissive Rules

If nothing works, temporarily use these permissive rules for testing:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null;
    }
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**⚠️ WARNING: These rules allow all authenticated users full access. Only use for testing!**

### Step 5: Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for error messages starting with `❌ [Store]`
4. Check for permission-denied errors
5. Look for logs showing user data and admin status

### Step 6: Sign Out and Sign Back In

After deploying rules:
1. Sign out completely
2. Clear browser cache (optional but recommended)
3. Sign back in
4. This refreshes the authentication token

### Common Issues:

1. **Rules not deployed**: The rules file exists locally but hasn't been published to Firebase
2. **Admin document missing isAdmin field**: The admin user document doesn't have `isAdmin: true`
3. **Field type mismatch**: `isAdmin` is stored as string "true" instead of boolean `true`
4. **Auth token not refreshed**: Old token doesn't have updated permissions

## Quick Test

After deploying rules, check the browser console. You should see:
- `🔍 [Store] getAllUsers - Success! Found X users`
- For admin: `🔍 [Store] Returning all users for admin`
- For regular users: `🔍 [Store] Filtered users for regular user: X`

If you see permission errors, the rules are not deployed correctly.


