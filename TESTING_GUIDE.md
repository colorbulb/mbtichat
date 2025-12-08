# Testing & Verification Guide

## Pre-Deployment Checklist

### ✅ Files Created/Modified

**New Files:**
- ✅ `functions/src/index.ts` - Cloud Functions implementation
- ✅ `functions/package.json` - Functions dependencies
- ✅ `functions/tsconfig.json` - TypeScript configuration
- ✅ `functions/.gitignore` - Git ignore for functions
- ✅ `ADMIN_PASSWORD_RESET.md` - Setup documentation
- ✅ `IMPLEMENTATION_SUMMARY.md` - Complete summary
- ✅ `scripts/deploy-functions.sh` - Deployment script

**Modified Files:**
- ✅ `firebase.json` - Added functions configuration
- ✅ `services/firebase.ts` - Added Functions import
- ✅ `services/store.ts` - Added admin password reset methods
- ✅ `components/AdminDashboard.tsx` - Added UI and handlers
- ✅ `firestore.rules` - Unified rules for both projects
- ✅ `../game/twoplayergame/game-platform/firestore.rules` - Unified rules

## Deployment Steps

### 1. Install Function Dependencies
```bash
cd /Users/louisc/Desktop/mbtichat2/functions
npm install
```

Expected output: `firebase-admin` and `firebase-functions` installed

### 2. Build Functions (Optional - happens during deploy)
```bash
cd /Users/louisc/Desktop/mbtichat2/functions
npm run build
```

Expected output: `lib/index.js` created

### 3. Deploy Everything
```bash
cd /Users/louisc/Desktop/mbtichat2
firebase deploy --only functions,firestore:rules
```

Expected output:
```
✔ Deploy complete!
Functions:
  adminResetPassword(us-central1)
  adminSendPasswordResetEmail(us-central1)
```

### 4. Verify Deployment
```bash
firebase functions:list
```

Should show:
- `adminResetPassword`
- `adminSendPasswordResetEmail`

## Testing the Implementation

### Test 1: Admin Dashboard UI
1. Open mbtichat2 app
2. Log in as admin user
3. Navigate to Admin Dashboard
4. Check that each non-admin user has 3 buttons:
   - **Edit** (blue)
   - **Reset PW** (yellow/warning)
   - **Delete** (red)

### Test 2: Password Reset Flow
1. Click **Reset PW** on a test user
2. Enter new password in prompt (e.g., "test1234")
3. Click OK
4. Should see success message: "Password reset successfully for [username]!"
5. Try logging in as that user with the new password

### Test 3: Verify Admin Logging
1. Go to Firebase Console
2. Navigate to Firestore Database
3. Check `admin_activities` collection
4. Should see a new document with:
   ```json
   {
     "adminId": "your-admin-uid",
     "adminEmail": "admin@example.com",
     "action": "password_reset",
     "targetUserId": "test-user-uid",
     "timestamp": "2025-12-08...",
     "details": "Password reset by admin"
   }
   ```

### Test 4: Security Check
1. Log in as a regular (non-admin) user
2. Open browser console
3. Try calling the function directly:
   ```javascript
   firebase.functions().httpsCallable('adminResetPassword')({
     userId: 'some-user-id',
     newPassword: 'hack123'
   })
   ```
4. Should get error: "Only admins can reset user passwords."

### Test 5: Cross-Project Compatibility
1. Test that twoplayergame can still access shared collections
2. Test that mbtichat2 can still access shared collections
3. Verify no conflicts when both apps are running

## Troubleshooting

### Issue: Functions won't deploy
**Solution:**
```bash
# Make sure you're logged in
firebase login

# Make sure you're using the right project
firebase use intjchat

# Try deploying again
firebase deploy --only functions
```

### Issue: "Permission denied" when calling function
**Check:**
1. Is the user logged in?
2. Does the user have `isAdmin: true` or `role: 'admin'` in Firestore?
3. Are the Firestore rules deployed?

```bash
firebase deploy --only firestore:rules
```

### Issue: Button not showing in Admin Dashboard
**Check:**
1. Is user logged in as admin?
2. Clear browser cache and reload
3. Check browser console for errors

### Issue: Password not updating
**Check:**
1. Firebase Console → Functions → Logs
2. Look for error messages
3. Verify Firebase Admin SDK is initialized

## Success Criteria

✅ Functions deployed successfully
✅ Firestore rules deployed for both projects
✅ Admin can see "Reset PW" button
✅ Admin can successfully reset passwords
✅ Actions are logged to `admin_activities`
✅ Non-admins cannot call the functions
✅ Both projects can access shared collections
✅ No conflicts between projects

## Post-Deployment

### Monitor Function Usage
```bash
# View logs
firebase functions:log

# View specific function logs
firebase functions:log --only adminResetPassword
```

### Check Firestore Rules
```bash
# Test rules in Firebase Console
# Firestore → Rules → Playground
```

### Monitor Costs
- Check Firebase Console → Usage & Billing
- Functions are free tier: 2M invocations/month
- Should be well within limits for admin operations

## Rollback Plan (If Needed)

### Rollback Functions
```bash
# Delete deployed functions
firebase functions:delete adminResetPassword
firebase functions:delete adminSendPasswordResetEmail
```

### Rollback Rules
1. Go to Firebase Console → Firestore → Rules
2. Click "History" tab
3. Click "Rollback" on previous version

### Rollback Client Code
```bash
cd /Users/louisc/Desktop/mbtichat2
git checkout services/firebase.ts
git checkout services/store.ts
git checkout components/AdminDashboard.tsx
```

## Next Steps After Successful Deployment

1. ✅ Test with a real user account
2. ✅ Document the feature for other admins
3. ✅ Set up monitoring alerts (optional)
4. ✅ Consider adding audit log viewer in Admin Dashboard
5. ✅ Train other admins on how to use the feature
