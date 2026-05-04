#!/bin/bash

# Vercel Environment Variables Setup Script
# This script helps you add all required environment variables to Vercel

echo "🚀 Setting up Vercel Environment Variables"
echo "=========================================="
echo ""
echo "This script will read from your .env.local and add variables to Vercel."
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local not found"
    exit 1
fi

# Source the .env.local file
set -a
source .env.local
set +a

echo "✅ Loaded variables from .env.local"
echo ""

# Function to add env var to Vercel
add_env_var() {
    local var_name=$1
    local var_value=$2

    if [ -z "$var_value" ]; then
        echo "⚠️  Skipping $var_name (empty)"
        return
    fi

    echo "Adding $var_name..."
    echo "$var_value" | vercel env add $var_name production --force
    echo "$var_value" | vercel env add $var_name preview --force
}

echo "📝 Adding environment variables to Vercel..."
echo ""

# Auth0 Core
add_env_var "AUTH0_SECRET" "$AUTH0_SECRET"
add_env_var "AUTH0_BASE_URL" "https://agency-inc-dashboard.vercel.app"  # Temporary - will update after custom domain
add_env_var "AUTH0_ISSUER_BASE_URL" "$AUTH0_ISSUER_BASE_URL"
add_env_var "AUTH0_CLIENT_ID" "$AUTH0_CLIENT_ID"
add_env_var "AUTH0_CLIENT_SECRET" "$AUTH0_CLIENT_SECRET"
add_env_var "AUTH0_AUDIENCE" "$AUTH0_AUDIENCE"
add_env_var "AUTH0_CONNECTION_ID" "$AUTH0_CONNECTION_ID"
add_env_var "AUTH0_SCOPE" "$AUTH0_SCOPE"

# Auth0 Management API
add_env_var "AUTH0_MGMT_DOMAIN" "$AUTH0_MGMT_DOMAIN"
add_env_var "AUTH0_MGMT_CLIENT_ID" "$AUTH0_MGMT_CLIENT_ID"
add_env_var "AUTH0_MGMT_CLIENT_SECRET" "$AUTH0_MGMT_CLIENT_SECRET"

# Auth0 FGA
add_env_var "FGA_STORE_ID" "$FGA_STORE_ID"
add_env_var "FGA_CLIENT_ID" "$FGA_CLIENT_ID"
add_env_var "FGA_CLIENT_SECRET" "$FGA_CLIENT_SECRET"
add_env_var "FGA_API_URL" "$FGA_API_URL"

# Firebase
add_env_var "FIREBASE_SERVICE_ACCOUNT_BASE64" "$FIREBASE_SERVICE_ACCOUNT_BASE64"

# CTE
add_env_var "CTE_CLIENT_ID" "$CTE_CLIENT_ID"
add_env_var "CTE_CLIENT_SECRET" "$CTE_CLIENT_SECRET"

# Public variables
add_env_var "NEXT_PUBLIC_ENABLED_MFA_FACTORS" "$NEXT_PUBLIC_ENABLED_MFA_FACTORS"
add_env_var "NEXT_PUBLIC_KONG_GATEWAY_URL" "$NEXT_PUBLIC_KONG_GATEWAY_URL"

echo ""
echo "✅ All environment variables added to Vercel!"
echo ""
echo "📋 Next steps:"
echo "1. Update AUTH0_BASE_URL after setting up custom domain"
echo "2. Update Auth0 callback URLs to include your Vercel URL"
echo "3. Run 'vercel --prod' to deploy to production"
