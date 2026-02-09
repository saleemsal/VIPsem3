#!/bin/bash

echo "🚀 Syncing repositories..."

# Push to origin (ChristopherSamahaGT/gt-study-wise)
echo "📤 Pushing to origin (ChristopherSamahaGT/gt-study-wise)..."
git push origin main

# Push to GT repository grace_branch
echo "📤 Pushing to GT repository grace_branch..."
git push gt main:grace_branch

echo "✅ Successfully synced to both repositories!"
