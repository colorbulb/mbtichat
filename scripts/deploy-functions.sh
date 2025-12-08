#!/bin/bash

# Deploy script for Firebase Functions and Rules
# This script deploys both the admin password reset functions and unified Firestore rules

set -e

echo "🚀 Starting Firebase deployment..."
echo ""

# Check if firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Please install it first:"
    echo "   npm install -g firebase-tools"
    exit 1
fi

# Get the current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "📦 Installing Functions dependencies..."
cd "$SCRIPT_DIR/functions"
npm install

echo ""
echo "🔧 Building Functions..."
cd "$SCRIPT_DIR/functions"
npm run build

echo ""
echo "☁️  Deploying Firebase Functions..."
cd "$SCRIPT_DIR"
firebase deploy --only functions

echo ""
echo "🔒 Deploying Firestore Rules..."
cd "$SCRIPT_DIR"
firebase deploy --only firestore:rules

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Test the admin password reset in the Admin Dashboard"
echo "   2. Check the admin_activities collection for logs"
echo "   3. Verify both mbtichat2 and twoplayergame can access shared collections"
echo ""
