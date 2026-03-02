#!/usr/bin/env bash
# Run Prisma migrations against DATABASE_URL.
# Usage: ./scripts/migrate.sh   or   npm run db:migrate
set -e
cd "$(dirname "$0")/.."
echo "Running database migrations..."
npx prisma migrate deploy
echo "Migrations complete."
