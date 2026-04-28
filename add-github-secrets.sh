#!/bin/bash

# GitHub Secrets Auto-Setup Script
# This script adds all GitHub secrets at once using GitHub CLI

set -e

echo "================================"
echo "🚀 QuickHire Auto-Deployment Setup"
echo "================================"
echo ""

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI not found. Install it:"
    echo "   brew install gh"
    echo ""
    echo "Then run this script again."
    exit 1
fi

# Check if logged in
if ! gh auth status &> /dev/null; then
    echo "❌ Not logged in to GitHub. Run:"
    echo "   gh auth login"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "✅ GitHub CLI is ready"
echo ""

# Get repo info
REPO=$(git remote get-url origin | sed 's/.*github.com\///' | sed 's/\.git$//')
echo "Repository: $REPO"
echo ""

# Collect secrets
echo "📋 Enter your 5 GitHub secrets:"
echo ""

read -p "1️⃣  VERCEL_TOKEN: " VERCEL_TOKEN
read -p "2️⃣  VERCEL_ORG_ID: " VERCEL_ORG_ID
read -p "3️⃣  VERCEL_PROJECT_ID: " VERCEL_PROJECT_ID
read -p "4️⃣  RENDER_API_KEY: " RENDER_API_KEY
read -p "5️⃣  RENDER_SERVICE_ID: " RENDER_SERVICE_ID

echo ""
echo "🔐 Adding secrets to GitHub..."
echo ""

# Add secrets using GitHub CLI
gh secret set VERCEL_TOKEN --body "$VERCEL_TOKEN" --repo "$REPO" && echo "✅ VERCEL_TOKEN added"
gh secret set VERCEL_ORG_ID --body "$VERCEL_ORG_ID" --repo "$REPO" && echo "✅ VERCEL_ORG_ID added"
gh secret set VERCEL_PROJECT_ID --body "$VERCEL_PROJECT_ID" --repo "$REPO" && echo "✅ VERCEL_PROJECT_ID added"
gh secret set RENDER_API_KEY --body "$RENDER_API_KEY" --repo "$REPO" && echo "✅ RENDER_API_KEY added"
gh secret set RENDER_SERVICE_ID --body "$RENDER_SERVICE_ID" --repo "$REPO" && echo "✅ RENDER_SERVICE_ID added"

echo ""
echo "================================"
echo "✨ All secrets added!"
echo "================================"
echo ""

# Verify
echo "📊 Verifying secrets..."
gh secret list --repo "$REPO"

echo ""
echo "🚀 Ready to deploy!"
echo ""
echo "Next step: Push your code"
echo "  git push origin main"
echo ""
echo "Auto-deployment will start automatically!"
