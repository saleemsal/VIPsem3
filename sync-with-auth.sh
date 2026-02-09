#!/bin/bash

echo "🚀 Syncing repositories..."

# Push to origin (ChristopherSamahaGT/gt-study-wise)
echo "📤 Pushing to origin (ChristopherSamahaGT/gt-study-wise)..."
git push origin main

# Push to GT repository grace_branch with credential helper
echo "📤 Pushing to GT repository grace_branch..."
echo "You may be prompted for GT GitHub credentials..."

# Use credential helper to store credentials
git config credential.helper store

# Push to GT repository
git push gt main:grace_branch

echo "✅ Sync attempt complete!"
echo "Note: If GT push failed, you may need to authenticate manually"
