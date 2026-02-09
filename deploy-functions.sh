#!/bin/bash

# Deployment script for Supabase Edge Functions
# Usage: ./deploy-functions.sh YOUR_SUPABASE_TOKEN

if [ -z "$1" ]; then
  echo "❌ Error: Please provide your Supabase access token"
  echo ""
  echo "Usage: ./deploy-functions.sh YOUR_TOKEN"
  echo ""
  echo "Get your token from: https://supabase.com/dashboard/account/tokens"
  exit 1
fi

export SUPABASE_ACCESS_TOKEN=$1
PROJECT_REF="ejfbwdsojuhvvooeztvx"

echo "🚀 Deploying Edge Functions..."
echo ""

echo "📦 Deploying chatgt function..."
supabase functions deploy chatgt --project-ref $PROJECT_REF

if [ $? -eq 0 ]; then
  echo "✅ chatgt deployed successfully"
else
  echo "❌ chatgt deployment failed"
  exit 1
fi

echo ""
echo "📦 Deploying deepseekapi function..."
supabase functions deploy deepseekapi --project-ref $PROJECT_REF

if [ $? -eq 0 ]; then
  echo "✅ deepseekapi deployed successfully"
else
  echo "❌ deepseekapi deployment failed"
  exit 1
fi

echo ""
echo "🎉 All functions deployed successfully!"
echo "🔄 Refresh your browser to test the chatbot"

