# Firebase App Distribution - Quick Setup Guide

Firebase App Distribution is an easier alternative to TestFlight for beta testing. No Apple review needed!

## Why Firebase App Distribution?

✅ No waiting for Apple review
✅ Instant distribution to testers
✅ Works on any iOS device (with UDID registered)
✅ Easier than TestFlight for internal testing
✅ Can be automated

## Setup Steps

### 1. Enable Firebase App Distribution

1. Go to [Firebase Console](https://console.firebase.google.com/project/intjchat/appdistribution)
2. Click "Get Started" in App Distribution
3. Click "Register app" and select iOS
4. Follow the setup wizard

### 2. Add iOS App to Firebase (if not already added)

1. Firebase Console > Project Settings
2. Under "Your apps", add iOS app
3. Bundle ID: `com.nedating.app`
4. Download `GoogleService-Info.plist`
5. Add to `ios/App/App/` folder in Xcode

### 3. Register Tester Devices (Important!)

For Ad Hoc distribution, you need device UDIDs:

**Option A: Have testers install Firebase App Tester app**
1. Testers install [Firebase App Tester](https://appdistribution.page.link/get-app-tester) from App Store
2. Open the app, it shows their UDID
3. They send you the UDID

**Option B: Get UDID via iTunes/Finder**
1. Connect device to Mac
2. Open Finder, select device
3. Click on device info to reveal UDID
4. Copy UDID

**Add UDIDs to Apple Developer Portal:**
1. Go to [Apple Developer - Devices](https://developer.apple.com/account/resources/devices/list)
2. Click "+" to register new device
3. Enter name and UDID
4. Register device

**Update Provisioning Profile:**
1. Go to [Profiles](https://developer.apple.com/account/resources/profiles/list)
2. Edit your Ad Hoc or Development profile
3. Add the new devices
4. Download updated profile
5. Double-click to install

### 4. Build iOS App

```bash
# Run the deployment script
bash scripts/deploy-firebase-distribution.sh
```

Or manually:

```bash
# Build and sync
npm run build
npx cap sync ios

# Open Xcode
npx cap open ios
```

In Xcode:
1. Select "Any iOS Device (arm64)" as target
2. Product > Archive
3. Wait for archive to complete
4. Window > Organizer
5. Select archive > Distribute App
6. Choose **"Ad Hoc"** (for Firebase Distribution)
7. Follow wizard and export
8. Save IPA file to `build/App.ipa` in your project

### 5. Upload to Firebase

**Option A: Firebase Console (Easy)**
1. Go to [Firebase App Distribution](https://console.firebase.google.com/project/intjchat/appdistribution)
2. Click "Distribute" or "New Release"
3. Upload the IPA file
4. Add release notes
5. Select testers/groups
6. Distribute!

**Option B: Command Line**
```bash
# Get your Firebase iOS App ID from Firebase Console > Project Settings > Your apps
npx firebase appdistribution:distribute build/App.ipa \
  --app YOUR_FIREBASE_IOS_APP_ID \
  --release-notes "Initial beta release with push notifications" \
  --groups "testers"
```

### 6. Invite Testers

1. Firebase Console > App Distribution > Testers & Groups
2. Click "Add Testers"
3. Enter email addresses
4. They'll receive invitation email
5. They install Firebase App Tester app
6. Accept invitation and install your app

## Quick Commands

```bash
# Login to Firebase
npx firebase login

# List your Firebase projects
npx firebase projects:list

# Distribute app (after building IPA)
npx firebase appdistribution:distribute build/App.ipa \
  --app YOUR_APP_ID \
  --groups testers
```

## Comparison: Firebase vs TestFlight

| Feature | Firebase Distribution | TestFlight |
|---------|----------------------|------------|
| Review Time | Instant | 1-3 days |
| Max Testers | Unlimited | 10,000 |
| Setup Complexity | Medium | Easy |
| Device Registration | Required (Ad Hoc) | Not required |
| Max Devices | 100 per year | Unlimited |
| Best For | Internal testing | External testing |
| Cost | Free | Free |

## TestFlight Alternative

If you still want TestFlight (recommended for larger beta):

1. In Xcode Organizer, select "App Store Connect" instead of "Ad Hoc"
2. Upload to App Store Connect
3. Wait for processing
4. Configure in TestFlight tab
5. Add testers
6. They get email with TestFlight link

**Advantage:** No device UDID needed, easier for external testers

## Troubleshooting

**Issue: "Could not find device UDID"**
- Device not registered in Apple Developer Portal
- Update provisioning profile after adding devices

**Issue: "Invalid provisioning profile"**
- Download latest profile from Apple Developer Portal
- Clean build in Xcode: Product > Clean Build Folder

**Issue: App won't install on device**
- Check device UDID is registered
- Verify provisioning profile includes device
- Rebuild with updated profile

## Recommended Workflow

**For Small Team (< 10 devices):**
Use Firebase App Distribution with Ad Hoc builds

**For Larger Beta (> 10 devices):**
Use TestFlight - no device registration needed

**For Both:**
1. Use Firebase Distribution for rapid internal testing
2. Use TestFlight for external beta and pre-release
3. Graduate to App Store for production

## Next Steps

1. ✅ Enable App Distribution in Firebase Console
2. ✅ Register tester devices in Apple Developer Portal
3. ✅ Build Ad Hoc IPA in Xcode
4. ✅ Upload to Firebase Distribution
5. ✅ Invite testers
6. ✅ Test and iterate!

---

**Need TestFlight instead?** See `IOS_TESTFLIGHT_GUIDE.md` for complete TestFlight setup.
