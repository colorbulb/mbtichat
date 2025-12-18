#!/bin/bash

# Firebase App Distribution Deployment Script
# This builds and uploads the iOS app to Firebase App Distribution for testing

set -e

echo "🚀 Building and deploying to Firebase App Distribution"
echo "======================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if firebase-tools is logged in
echo "📋 Checking Firebase authentication..."
if ! npx firebase-tools projects:list &>/dev/null; then
    echo -e "${YELLOW}⚠️  Not logged into Firebase. Logging in...${NC}"
    npx firebase-tools login
fi

# Build the web app
echo ""
echo "🏗️  Building web app..."
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

# Sync with iOS
echo ""
echo "🔄 Syncing with iOS..."
npx cap sync ios

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Sync failed!${NC}"
    exit 1
fi

# Build iOS app
echo ""
echo "📱 Building iOS app..."
echo "This will open Xcode. Please:"
echo "1. Select 'Any iOS Device (arm64)' as target"
echo "2. Go to Product > Archive"
echo "3. Once archived, go to Window > Organizer"
echo "4. Select the archive and click 'Distribute App'"
echo "5. Choose 'Ad Hoc' or 'Development'"
echo "6. Export the IPA file to the 'build' folder in this project"
echo ""
read -p "Press Enter to open Xcode..."

# Create build directory if it doesn't exist
mkdir -p build

npx cap open ios

echo ""
echo -e "${GREEN}✅ Next Steps:${NC}"
echo "1. After exporting the IPA file, save it to: $(pwd)/build/App.ipa"
echo "2. Then run: npx firebase-tools appdistribution:distribute build/App.ipa --app YOUR_FIREBASE_IOS_APP_ID --groups testers"
echo ""
echo "Or use the Firebase Console to upload manually:"
echo "https://console.firebase.google.com/project/intjchat/appdistribution"
echo ""
echo -e "${YELLOW}Note: You'll need to set up Firebase App Distribution in the Firebase Console first${NC}"
