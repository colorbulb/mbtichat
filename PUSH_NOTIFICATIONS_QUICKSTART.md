# Push Notifications & TestFlight - Quick Reference

## Quick Start Commands

```bash
# Build web app
npm run build

# Sync with iOS
npx cap sync ios

# Open in Xcode
npm run cap:open:ios

# Or all in one
npm run ios:build
```

## Firebase Setup Checklist

- [ ] Generate VAPID key in Firebase Console
- [ ] Update VAPID_KEY in `services/notifications.ts`
- [ ] Create APNs authentication key (.p8)
- [ ] Upload APNs key to Firebase
- [ ] Deploy cloud functions: `cd functions && npm run deploy`

## Xcode Configuration Checklist

- [ ] Bundle ID: `com.nedating.app`
- [ ] Team: Select your Apple Developer team
- [ ] Enable "Push Notifications" capability
- [ ] Enable "Background Modes" > "Remote notifications"
- [ ] Add camera/photo permissions to Info.plist
- [ ] Update app icon in Assets.xcassets
- [ ] Set Display Name: "NE Dating"
- [ ] Set Version and Build number

## TestFlight Upload Steps

1. Product > Archive in Xcode
2. Window > Organizer
3. Select archive > Distribute App
4. Choose App Store Connect
5. Upload
6. Wait for processing in App Store Connect
7. Add testers in TestFlight tab

## Testing Push Notifications

### On Device
1. Install from TestFlight
2. Log in to app
3. Grant notification permission
4. Send a test message from another account

### Manual Test via Firebase Console
1. Firebase Console > Cloud Messaging
2. Send test message
3. Enter FCM token from device logs
4. Check notification arrives

## Common FCM Token Issues

**Token not saved:**
- Check browser/iOS permissions granted
- Review console logs for errors
- Verify `fcmTokens` field exists in user document

**Notifications not received:**
- Ensure APNs key uploaded to Firebase
- Check cloud function logs
- Verify background modes enabled
- Test with device in background/locked

## File Structure

```
mbtichat2/
├── capacitor.config.ts           # Capacitor config
├── ios/                           # iOS native project
│   └── App/
│       └── App.xcodeproj         # Xcode project
├── services/
│   ├── firebase.ts               # Firebase + Messaging
│   └── notifications.ts          # Notification service
├── hooks/
│   └── useNotifications.ts       # React hook
├── public/
│   └── firebase-messaging-sw.js  # Service worker
└── functions/
    └── src/
        └── index.ts              # Cloud functions
```

## Key Firebase Rules to Update

Add to `firestore.rules`:

```javascript
match /users/{userId} {
  allow read: if request.auth != null;
  allow update: if request.auth.uid == userId 
    || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
}
```

## Notification Data Structure

### User Document
```typescript
{
  id: string;
  email: string;
  displayName: string;
  fcmTokens: string[];  // Array of device tokens
  lastTokenUpdate: string;
  // ... other fields
}
```

### Notification Payload
```typescript
{
  notification: {
    title: string;
    body: string;
  },
  data: {
    type: 'message' | 'activity' | 'match';
    chatId?: string;
    senderId?: string;
    activityType?: string;
  }
}
```

## Version Updates

When releasing updates:

1. Update version in Xcode (e.g., 1.0.1)
2. Increment build number (e.g., 2)
3. `npm run build && npx cap sync ios`
4. Archive and upload new build
5. New build appears in TestFlight automatically

## Debugging Tools

```bash
# View Capacitor logs
npx cap sync ios --verbose

# Clean iOS build
cd ios/App && pod install --repo-update

# Check Firebase functions logs
firebase functions:log --only sendMessageNotification

# Monitor device logs in Xcode
Window > Devices and Simulators > Select device > Open Console
```

## Important URLs

- **Firebase Console:** https://console.firebase.google.com/
- **App Store Connect:** https://appstoreconnect.apple.com/
- **Apple Developer:** https://developer.apple.com/account/
- **TestFlight:** https://testflight.apple.com/

## Support Contacts

- Apple Developer Support: https://developer.apple.com/support/
- Firebase Support: https://firebase.google.com/support/
- Capacitor Discord: https://discord.gg/UPYqMVH

## Pro Tips

💡 Always test on a real device, not just simulator
💡 Request permissions at the right moment (after login)
💡 Include clear "What to Test" notes in TestFlight
💡 Keep build numbers incrementing even for same version
💡 Use meaningful commit messages for tracking builds
💡 Monitor cloud function costs in Firebase Console
💡 Set up budget alerts in Google Cloud Console

## Emergency Rollback

If a build has critical issues:

1. Mark previous build as "Ready for Testing" in TestFlight
2. Notify testers about the rollback
3. Fix issues and upload new build
4. Never delete builds - keeps testing history

## Success Metrics

Track these in Firebase Analytics:
- Daily active users
- Notification opt-in rate
- Notification open rate
- Message send/receive rate
- Session duration
- Crash-free rate

---

**Ready to launch?** Follow the complete guide in `IOS_TESTFLIGHT_GUIDE.md`
