#!/bin/sh
set -e
echo "🔄 Running Prisma migrations..."
npm run prisma:migrate
echo "🌱 Seeding database (first run only)..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.count().then(count => {
  if (count === 0) {
    console.log('Empty DB detected, running seed...');
    process.exit(1);
  } else {
    console.log('DB already seeded (' + count + ' users), skipping.');
    process.exit(0);
  }
}).finally(() => prisma.\$disconnect());
" || npm run prisma:seed || true
echo "🚀 Starting SIMS Backend..."
exec "$@"
