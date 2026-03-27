#!/bin/bash
# Set Railway environment variables for HajjBro production
# Run from project root: ./scripts/set-railway-vars.sh
# Requires: railway link (link to your project first)

set -e

echo "Setting Railway variables for HajjBro..."
echo ""

# Required - you must set JWT_SECRET (generate with: openssl rand -base64 32)
if [ -z "$JWT_SECRET" ]; then
  echo "JWT_SECRET is required. Set it first:"
  echo "  export JWT_SECRET=\$(openssl rand -base64 32)"
  echo "  ./scripts/set-railway-vars.sh"
  exit 1
fi

railway variable set JWT_SECRET="$JWT_SECRET"
echo "✓ JWT_SECRET set"

# Optional - defaults are fine for most deployments
railway variable set NODE_ENV=production
railway variable set RATE_LIMIT_MAX=100
railway variable set RATE_LIMIT_AUTH_MAX=10
railway variable set CORS_ORIGINS="*"

echo ""
echo "✓ All Railway variables set."
echo "Note: DATABASE_URL and PORT are set automatically by Railway when you add PostgreSQL."
