#!/bin/bash

# Automated IPA Generation Script
# This script builds an iOS IPA using xcodebuild command line

set -e

echo "📱 Automated iOS IPA Builder"
echo "============================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
IOS_DIR="$PROJECT_DIR/ios/App"
BUILD_DIR="$PROJECT_DIR/build"
ARCHIVE_PATH="$BUILD_DIR/App.xcarchive"
EXPORT_PATH="$BUILD_DIR"
SCHEME="App"
WORKSPACE="App.xcworkspace"

# Create build directory
mkdir -p "$BUILD_DIR"

# Check if already built web app
if [ ! -d "$PROJECT_DIR/dist" ]; then
    echo -e "${YELLOW}⚠️  Web app not built. Building now...${NC}"
    cd "$PROJECT_DIR"
    npm run build
fi

# Sync with Capacitor
echo ""
echo "🔄 Syncing with iOS..."
cd "$PROJECT_DIR"
npx cap sync ios

# Navigate to iOS directory
cd "$IOS_DIR"

echo ""
echo "📋 Checking Xcode setup..."

# Check for workspace
if [ ! -d "$WORKSPACE" ]; then
    echo -e "${RED}❌ Workspace not found. Running pod install...${NC}"
    pod install
fi

echo ""
echo -e "${BLUE}🔨 Building iOS Archive...${NC}"
echo "This may take 5-10 minutes..."
echo ""

# Clean build folder
xcodebuild clean \
    -workspace "$WORKSPACE" \
    -scheme "$SCHEME" \
    -configuration Release

# Build archive for generic iOS device
xcodebuild archive \
    -workspace "$WORKSPACE" \
    -scheme "$SCHEME" \
    -configuration Release \
    -archivePath "$ARCHIVE_PATH" \
    -destination 'generic/platform=iOS' \
    -allowProvisioningUpdates \
    CODE_SIGN_IDENTITY="iPhone Distribution" \
    DEVELOPMENT_TEAM="" \
    | xcpretty || xcodebuild archive \
    -workspace "$WORKSPACE" \
    -scheme "$SCHEME" \
    -configuration Release \
    -archivePath "$ARCHIVE_PATH" \
    -destination 'generic/platform=iOS' \
    -allowProvisioningUpdates

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Archive failed!${NC}"
    echo ""
    echo "Common issues:"
    echo "1. No valid signing certificate - You need to set up signing in Xcode"
    echo "2. Missing provisioning profile - Configure in Apple Developer Portal"
    echo "3. Team ID not set - Open Xcode and select your team"
    echo ""
    echo -e "${YELLOW}⚠️  Please open Xcode and configure signing:${NC}"
    echo "   open $IOS_DIR/$WORKSPACE"
    echo ""
    echo "Then try these manual steps in Xcode:"
    echo "1. Select 'App' target"
    echo "2. Signing & Capabilities > Select your Team"
    echo "3. Product > Archive"
    echo "4. Distribute App > Ad Hoc (or App Store Connect for TestFlight)"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Archive created successfully!${NC}"
echo "Archive location: $ARCHIVE_PATH"
echo ""

# Create export options plist for Ad Hoc distribution
cat > "$BUILD_DIR/ExportOptions.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>ad-hoc</string>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
    <key>compileBitcode</key>
    <false/>
</dict>
</plist>
EOF

echo -e "${BLUE}📦 Exporting IPA...${NC}"
echo ""

# Export IPA
xcodebuild -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportPath "$EXPORT_PATH" \
    -exportOptionsPlist "$BUILD_DIR/ExportOptions.plist" \
    -allowProvisioningUpdates

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Export failed!${NC}"
    echo ""
    echo "The archive was created but export failed."
    echo "This usually means signing configuration needs adjustment."
    echo ""
    echo -e "${YELLOW}Try manually in Xcode:${NC}"
    echo "1. Window > Organizer"
    echo "2. Select the archive"
    echo "3. Distribute App > Ad Hoc"
    echo "4. Follow the wizard to export"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 IPA Generated Successfully!${NC}"
echo ""
echo "IPA Location: $EXPORT_PATH/App.ipa"
echo ""
echo "Next steps:"
echo "1. Upload to Firebase App Distribution:"
echo "   npx firebase appdistribution:distribute build/App.ipa --app YOUR_APP_ID"
echo ""
echo "2. Or install directly on a registered device:"
echo "   - Use Apple Configurator 2"
echo "   - Or drag & drop to Xcode Devices window"
echo ""
echo "3. Or upload to TestFlight manually via:"
echo "   https://appstoreconnect.apple.com/"
