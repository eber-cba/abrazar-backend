#!/bin/bash
# Initialize Prisma
echo "Initializing Prisma..."
npx prisma generate
npx prisma migrate dev --name init
echo "Prisma initialized."
