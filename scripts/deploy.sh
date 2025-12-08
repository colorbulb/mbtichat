#!/bin/bash

# Deploy script: Build, commit with auto-generated message, push, and deploy

set -e

echo "🔨 Building project..."
npm run build

echo "📝 Checking for changes..."
if [ -z "$(git status --porcelain)" ]; then
  echo "No changes to commit. Proceeding with deployment..."
else
  echo "📦 Staging changes..."
  git add -A

  echo "📋 Generating commit message..."
  
  # Get list of changed files
  CHANGED_FILES=$(git diff --cached --name-only)
  
  # Initialize commit message parts
  PARTS=()
  
  # Analyze changes by component/feature
  if echo "$CHANGED_FILES" | grep -qi "ChatScreen"; then
    PARTS+=("Chat features")
  fi
  if echo "$CHANGED_FILES" | grep -qi "ProfileScreen\|ViewProfileScreen"; then
    PARTS+=("Profile updates")
  fi
  if echo "$CHANGED_FILES" | grep -qi "DiscoverScreen"; then
    PARTS+=("Discover improvements")
  fi
  if echo "$CHANGED_FILES" | grep -qi "EventsScreen"; then
    PARTS+=("Events updates")
  fi
  if echo "$CHANGED_FILES" | grep -qi "AdminDashboard"; then
    PARTS+=("Admin features")
  fi
  if echo "$CHANGED_FILES" | grep -qi "store\.ts\|types\.ts"; then
    PARTS+=("Data layer")
  fi
  if echo "$CHANGED_FILES" | grep -qi "firestore\.rules"; then
    PARTS+=("Security rules")
  fi
  if echo "$CHANGED_FILES" | grep -qi "package\.json"; then
    PARTS+=("Dependencies")
  fi
  if echo "$CHANGED_FILES" | grep -qE "\.(css|scss|html)"; then
    PARTS+=("Styling")
  fi
  
  # Build commit message
  if [ ${#PARTS[@]} -gt 0 ]; then
    COMMIT_MSG="Deploy: $(IFS=', '; echo "${PARTS[*]}")"
  else
    COMMIT_MSG="Deploy: Updates"
  fi
  
  # Add timestamp
  COMMIT_MSG="${COMMIT_MSG} - $(date '+%Y-%m-%d %H:%M:%S')"
  
  # Add file statistics
  FILE_COUNT=$(echo "$CHANGED_FILES" | wc -l | tr -d ' ')
  STATS=$(git diff --cached --shortstat 2>/dev/null || echo "")
  if [ -n "$STATS" ]; then
    COMMIT_MSG="${COMMIT_MSG}\n\n${STATS}"
  else
    COMMIT_MSG="${COMMIT_MSG}\n\n${FILE_COUNT} file(s) changed"
  fi

  echo "💾 Committing changes..."
  git commit -m "$COMMIT_MSG" || echo "Nothing to commit or commit failed"
fi

echo "🚀 Pushing to git (overriding remote)..."
git push --force-with-lease origin main || git push --force origin main || echo "Push failed"

echo "🔥 Deploying to Firebase..."
firebase deploy

echo "✅ Deployment complete!"

