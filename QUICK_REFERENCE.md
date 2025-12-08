# Quick Reference: Admin Password Reset

## 🚀 Quick Start (First Time Setup)

```bash
# 1. Install dependencies
cd /Users/louisc/Desktop/mbtichat2/functions
npm install

# 2. Deploy everything
cd /Users/louisc/Desktop/mbtichat2
./scripts/deploy-functions.sh
```

## 📋 Daily Usage

### Reset User Password
1. Open Admin Dashboard
2. Find user in list
3. Click **Reset PW** (yellow button)
4. Enter new password (min 6 chars)
5. Done! ✅

### Check Reset Logs
**Firebase Console → Firestore → `admin_activities`**

## 🔑 Key Points

| Feature | Details |
|---------|---------|
| **Password Length** | Minimum 6 characters |
| **Who Can Reset** | Users with `isAdmin: true` or `role: 'admin'` |
| **Effective When** | Immediately after reset |
| **Logging** | All resets logged to `admin_activities` |
| **User Notification** | None (admin must inform user) |

## 🎯 Common Tasks

### Reset Multiple Passwords
```
For each user:
1. Click Reset PW
2. Enter: temp123456
3. Inform user to change password
```

### Check If Function Is Working
```bash
firebase functions:log --only adminResetPassword
```

### View Admin Activity Log
**Firestore Console:**
```
admin_activities/
  └── Check recent entries for action: 'password_reset'
```

## ⚠️ Important Notes

- ✅ Password resets take effect immediately
- ✅ User is NOT logged out when password changes
- ✅ Old password becomes invalid instantly
- ⚠️ No email notification is sent
- ⚠️ Inform users when you reset their password

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Button not showing | Verify you're logged in as admin |
| "Permission denied" | Check Firestore: user has `isAdmin: true` |
| Password not working | Ensure min 6 characters |
| Function error | Check logs: `firebase functions:log` |

## 📞 Support Resources

- **Setup Guide:** `ADMIN_PASSWORD_RESET.md`
- **Testing Guide:** `TESTING_GUIDE.md`
- **Architecture:** `ARCHITECTURE.md`
- **Full Summary:** `IMPLEMENTATION_SUMMARY.md`

## 🔄 Both Projects Work Together

**mbtichat2** and **twoplayergame** share:
- ✅ Same user database
- ✅ Same admin privileges
- ✅ Same password reset functions
- ✅ Same Firestore rules

**No conflicts!** Both projects coexist peacefully.
