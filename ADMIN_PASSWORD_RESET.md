# Admin Password Reset Setup

## Overview

Admins can now directly reset user passwords through the web portal using Firebase Cloud Functions with Admin SDK.

## Features

✅ **Direct Password Reset** - Admin can set a new password immediately without email
✅ **Unified Firestore Rules** - Both `mbtichat2` and `twoplayergame` projects can coexist
✅ **Admin Audit Trail** - All password resets are logged to `admin_activities` collection
✅ **Security** - Only verified admins can reset passwords (checks `isAdmin=true` or `role='admin'`)

## Setup Instructions

### 1. Install Firebase Functions Dependencies

```bash
cd /Users/louisc/Desktop/mbtichat2/functions
npm install
```

### 2. Deploy Firebase Functions

```bash
# From the mbtichat2 directory
firebase deploy --only functions
```

### 3. Deploy Updated Firestore Rules

```bash
# Deploy rules for mbtichat2
cd /Users/louisc/Desktop/mbtichat2
firebase deploy --only firestore:rules

# Deploy rules for twoplayergame (same rules, both projects share the database)
cd /Users/louisc/Desktop/game/twoplayergame/game-platform
firebase deploy --only firestore:rules
```

## Usage

### Admin Dashboard

1. Log in as an admin user
2. Navigate to the Admin Dashboard
3. Find the user you want to reset the password for
4. Click the **"Reset PW"** button (yellow/warning color)
5. Enter the new password in the prompt (minimum 6 characters)
6. The password is immediately updated

### Functions Available

#### `adminResetPassword`
Directly sets a new password for any user.

**Parameters:**
- `userId` (string) - The Firebase Auth UID of the user
- `newPassword` (string) - The new password (min 6 chars)

**Example:**
```typescript
await store.adminResetPassword(userId, 'newPassword123');
```

#### `adminSendPasswordResetEmail`
Sends a password reset email to the user (alternative method).

**Parameters:**
- `email` (string) - The user's email address

**Example:**
```typescript
await store.adminSendPasswordResetEmail('user@example.com');
```

## Firestore Rules - Unified for Both Projects

Both `mbtichat2` and `twoplayergame` now use the same Firestore rules that:

1. **Support both admin types:**
   - `isAdmin: true` (mbtichat2)
   - `role: 'admin'` (twoplayergame)

2. **Shared collections:** Both projects can access:
   - `users`, `chats`, `messages`
   - `personality_phrases`, `system_data`
   - `audio_questions`, `dating_categories`, `events`
   - Admin tracking collections
   - Gamification collections

3. **Project-specific collections:**
   - `game_rooms` (twoplayergame only) - won't interfere with mbtichat2

4. **No overwrites:** Collections are namespaced properly, projects won't conflict

## Security

✅ Only authenticated users with `isAdmin=true` or `role='admin'` can call functions
✅ All password resets are logged to `admin_activities` collection
✅ Users cannot escalate their own privileges
✅ Firebase Admin SDK ensures secure password updates

## Troubleshooting

### Functions not deploying?
- Make sure you're logged into Firebase CLI: `firebase login`
- Check your Firebase project: `firebase use --add`
- Ensure Node.js 18+ is installed

### Permission denied errors?
- Verify the admin user has `isAdmin: true` or `role: 'admin'` in Firestore
- Check Firebase console > Authentication > Users
- Verify Firestore rules are deployed: `firebase deploy --only firestore:rules`

### Can't call functions from client?
- Make sure `firebase` package version is 12.6.0+
- Check browser console for CORS errors
- Verify functions are deployed: `firebase functions:list`

## Admin Activities Log

All password resets create a log entry:

```typescript
{
  adminId: "admin_uid",
  adminEmail: "admin@example.com",
  action: "password_reset",
  targetUserId: "user_uid",
  timestamp: ServerTimestamp,
  details: "Password reset by admin"
}
```

View logs in Firestore console under `admin_activities` collection.
