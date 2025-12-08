# Admin Password Reset - Architecture & Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Firebase Project: intjchat                │
│                                                                   │
│  ┌─────────────────┐              ┌─────────────────┐           │
│  │   mbtichat2     │              │  twoplayergame  │           │
│  │   Web Portal    │              │   Web Portal    │           │
│  │                 │              │                 │           │
│  │  (Admin Dash)   │              │  (Admin Panel)  │           │
│  └────────┬────────┘              └────────┬────────┘           │
│           │                                 │                    │
│           └─────────────┬───────────────────┘                    │
│                         ↓                                        │
│           ┌─────────────────────────────┐                        │
│           │   Shared Firestore Database │                        │
│           │                             │                        │
│           │  • users/                   │                        │
│           │  • chats/                   │                        │
│           │  • admin_activities/        │                        │
│           │  • [other collections]      │                        │
│           │                             │                        │
│           │  game_rooms/ (twoplayergame)│                        │
│           └─────────────┬───────────────┘                        │
│                         │                                        │
│           ┌─────────────▼───────────────┐                        │
│           │   Firebase Cloud Functions  │                        │
│           │                             │                        │
│           │  • adminResetPassword()     │                        │
│           │  • adminSendPasswordReset() │                        │
│           └─────────────┬───────────────┘                        │
│                         │                                        │
│                         ↓                                        │
│           ┌─────────────────────────────┐                        │
│           │   Firebase Authentication   │                        │
│           │   (User Password Storage)   │                        │
│           └─────────────────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

## Password Reset Flow

### Step-by-Step Process

```
1. ADMIN CLICKS "RESET PW" BUTTON
   ↓
   [AdminDashboard.tsx]
   handleResetPassword(userId, username, email)
   ↓
   
2. ADMIN ENTERS NEW PASSWORD
   ↓
   const newPassword = prompt("Enter new password...")
   ↓
   
3. VALIDATION (CLIENT-SIDE)
   ↓
   if (newPassword.length < 6) → ERROR
   ↓
   
4. CALL FIREBASE FUNCTION
   ↓
   [store.ts]
   await store.adminResetPassword(userId, newPassword)
   ↓
   
5. FUNCTION VERIFIES ADMIN
   ↓
   [Cloud Function: adminResetPassword]
   - Check if caller is authenticated
   - Verify caller has isAdmin=true or role='admin'
   - If not admin → throw permission-denied error
   ↓
   
6. UPDATE PASSWORD IN FIREBASE AUTH
   ↓
   await admin.auth().updateUser(userId, {
     password: newPassword
   })
   ↓
   
7. LOG TO ADMIN ACTIVITIES
   ↓
   await admin.firestore().collection('admin_activities').add({
     adminId: callerId,
     action: 'password_reset',
     targetUserId: userId,
     timestamp: serverTimestamp()
   })
   ↓
   
8. RETURN SUCCESS
   ↓
   [AdminDashboard.tsx]
   Display success message
   ↓
   
9. USER CAN NOW LOGIN WITH NEW PASSWORD
```

## Firestore Rules Logic

### Admin Verification

```javascript
// Function checks BOTH admin types
function isAdmin() {
  return isAuthenticated() && 
    exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
    (
      get(...).data.isAdmin == true       // ← mbtichat2 style
      ||
      get(...).data.role == 'admin'       // ← twoplayergame style
    );
}
```

### User Update Rules

```javascript
match /users/{userId} {
  allow update: if
    isAdmin()                             // ← Admins can update anything
    ||
    (
      request.auth.uid == userId          // ← Users can update themselves
      && 
      !canEscalatePrivileges()            // ← But can't make self admin
    );
}
```

## Data Flow Diagram

### Admin Dashboard → Cloud Function → Auth Update

```
┌──────────────────┐
│  Admin Dashboard │
│                  │
│  [User List]     │
│  ┌────────────┐  │
│  │ User 1     │  │
│  │ [Edit]     │  │
│  │ [Reset PW] │◄─┼─── Click
│  │ [Delete]   │  │
│  └────────────┘  │
└────────┬─────────┘
         │
         │ httpsCallable('adminResetPassword')
         │ { userId, newPassword }
         ↓
┌────────────────────┐
│  Cloud Function    │
│                    │
│  1. Verify Admin   │
│  2. Validate Input │
│  3. Update Auth    │
│  4. Log Activity   │
└────────┬───────────┘
         │
         ├──────────────────┐
         ↓                  ↓
┌─────────────────┐  ┌─────────────────┐
│ Firebase Auth   │  │  Firestore DB   │
│                 │  │                 │
│ Update password │  │ Log to:         │
│ for user        │  │ admin_activities│
└─────────────────┘  └─────────────────┘
```

## Collection Structure

### Shared Collections (Both Projects)

```
firestore/
├── users/
│   ├── {userId}
│   │   ├── username
│   │   ├── email
│   │   ├── isAdmin ←────────┐
│   │   └── role ←────────────┼── Admin indicators
│   │                          │
├── chats/                     │
│   └── {chatId}/              │
│       └── messages/          │
│                              │
├── admin_activities/ ←────────┤
│   └── {activityId}           │
│       ├── adminId            │
│       ├── action             │
│       ├── targetUserId       │
│       └── timestamp          │
│                              │
└── [other shared collections] │
                               │
                               │
Admin Function checks ─────────┘
for these fields
```

### Project-Specific Collections

```
firestore/
└── game_rooms/              ← twoplayergame ONLY
    └── {gameType}/
        └── {roomId}/
            ├── host
            ├── players
            └── gameState
```

## Security Model

### 3-Layer Security

```
Layer 1: Client-Side Validation
┌─────────────────────────────┐
│ • Check user is logged in   │
│ • Check user is admin       │
│ • Validate password length  │
│ • Show/hide UI elements     │
└──────────┬──────────────────┘
           ↓
Layer 2: Firestore Rules
┌─────────────────────────────┐
│ • Verify authentication     │
│ • Check isAdmin/role fields │
│ • Prevent privilege escal.  │
│ • Control read/write access │
└──────────┬──────────────────┘
           ↓
Layer 3: Cloud Function
┌─────────────────────────────┐
│ • Verify admin in Firestore │
│ • Validate all inputs       │
│ • Use Admin SDK (server)    │
│ • Log all actions           │
└─────────────────────────────┘
```

## Code Components

### Key Files & Their Roles

```
mbtichat2/
│
├── functions/
│   ├── src/
│   │   └── index.ts ───────────► Cloud Functions (Admin SDK)
│   └── package.json ───────────► Dependencies
│
├── services/
│   ├── firebase.ts ────────────► Firebase initialization + Functions
│   └── store.ts ───────────────► Admin password reset methods
│
├── components/
│   └── AdminDashboard.tsx ─────► UI + handlers
│
├── firestore.rules ────────────► Security rules (unified)
└── firebase.json ──────────────► Firebase config
```

## Error Handling Flow

```
Try to Reset Password
         ↓
    ┌────────────────────────┐
    │ Is user authenticated? │
    └───┬────────────────┬───┘
        NO               YES
        ↓                ↓
    [ERROR]      ┌──────────────┐
    Unauthenticated  │ Is user admin? │
                 └───┬──────┬───┘
                     NO     YES
                     ↓      ↓
                 [ERROR]  ┌────────────────┐
                 Permission│ Valid password?│
                 Denied   └───┬──────┬───┘
                              NO     YES
                              ↓      ↓
                          [ERROR]  ┌──────────┐
                          Invalid  │  Update  │
                          Password │ Password │
                                   └──┬───────┘
                                      ↓
                                   SUCCESS
```

## Deployment Order

```
1. Create Functions
   ├── functions/src/index.ts
   ├── functions/package.json
   └── functions/tsconfig.json
   
2. Update Client Code
   ├── services/firebase.ts
   ├── services/store.ts
   └── components/AdminDashboard.tsx
   
3. Update Rules
   ├── mbtichat2/firestore.rules
   └── twoplayergame/firestore.rules
   
4. Update Config
   └── firebase.json
   
5. Deploy
   ├── npm install (in functions/)
   ├── firebase deploy --only functions
   └── firebase deploy --only firestore:rules
```

## Success Indicators

✅ **Deployment Success**
- Functions deployed without errors
- Rules validated and deployed
- No TypeScript compilation errors

✅ **Functionality Success**
- Admin can see "Reset PW" button
- Password reset works
- User can login with new password
- Actions logged to admin_activities

✅ **Security Success**
- Non-admins cannot call functions
- Users cannot escalate privileges
- All admin actions are logged

✅ **Compatibility Success**
- Both projects work simultaneously
- No collection conflicts
- Shared collections accessible by both
