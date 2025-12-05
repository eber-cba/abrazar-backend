# ===========================================

# PRODUCTION ENVIRONMENT TEMPLATE

# ===========================================

# Copy this file to .env and fill in the values

# NEVER commit .env to version control!

# ===========================================

# NODE ENVIRONMENT

# ===========================================

NODE_ENV=production
PORT=8080

# ===========================================

# DATABASE (Railway PostgreSQL)

# ===========================================

DATABASE_URL=postgresql://postgres:<password>@<host>:<port>/railway

# ===========================================

# REDIS (Railway Redis)

# ===========================================

REDIS_URL=redis://default:<password>@<host>:<port>

# ===========================================

# JWT AUTHENTICATION

# ===========================================

# Generate with: openssl rand -base64 64

JWT_SECRET=<your-64-byte-secret-here>
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<your-64-byte-refresh-secret-here>
JWT_REFRESH_EXPIRES_IN=7d

# ===========================================

# SUPERADMIN SECURITY

# ===========================================

# Primary secret for SuperAdmin mode

SUPERADMIN_SECRET=<your-primary-secret-min-32-chars>

# Optional backup secret for rotation

SUPERADMIN_SECRET_BACKUP=<your-backup-secret-min-32-chars>

# Rate limit per minute (default: 3)

SUPERADMIN_RATE_LIMIT=3

# Enable JTI anti-replay (default: true)

SUPERADMIN_JTI_ENABLED=true

# ===========================================

# CLOUDINARY (Image Uploads)

# ===========================================

CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>

# ===========================================

# FIREBASE (Optional - Social Auth)

# ===========================================

# FIREBASE_SERVICE_ACCOUNT=<base64-encoded-json>

# ===========================================

# GOOGLE PLACES API (Optional)

# ===========================================

# GOOGLE_PLACES_API_KEY=<your-api-key>

# ===========================================

# CORS CONFIGURATION

# ===========================================

# Comma-separated list of allowed origins

CORS_ORIGINS=https://your-frontend.vercel.app,https://your-mobile-app.com

# ===========================================

# LOGGING

# ===========================================

LOG_LEVEL=info
