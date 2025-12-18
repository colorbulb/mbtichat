#!/bin/bash

# Quick setup script for iOS development
# This script helps you get started with iOS development quickly

echo "🚀 NE Dating - iOS Setup Helper"
echo "================================"
echo ""

# Check if we're in the right directory
if [ ! -f "capacitor.config.ts" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."
echo ""

if ! command_exists node; then
    echo "❌ Node.js is not installed"
    echo "   Install from: https://nodejs.org/"
    exit 1
else
    echo "✅ Node.js installed: $(node --version)"
fi

if ! command_exists npm; then
    echo "❌ npm is not installed"
    exit 1
else
    echo "✅ npm installed: $(npm --version)"
fi

if ! command_exists pod; then
    echo "⚠️  CocoaPods not installed"
    echo "   Install with: sudo gem install cocoapods"
fi

if ! command_exists xcodebuild; then
    echo "❌ Xcode not installed"
    echo "   Install from Mac App Store"
    exit 1
else
    echo "✅ Xcode installed"
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🏗️  Building web app..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo ""
echo "🔄 Syncing with iOS..."
npx cap sync ios

if [ $? -ne 0 ]; then
    echo "❌ Sync failed!"
    exit 1
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📱 Next steps:"
echo "1. Open Xcode: npm run cap:open:ios"
echo "2. Configure signing & capabilities"
echo "3. Add Push Notifications capability"
echo "4. Add Background Modes > Remote notifications"
echo "5. Build and run on a device"
echo ""
echo "📚 Full guide: See IOS_TESTFLIGHT_GUIDE.md"
echo ""

# Ask if user wants to open Xcode now
read -p "Open Xcode now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Opening Xcode..."
    npx cap open ios
fi
