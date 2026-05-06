#!/bin/bash

# Setup Local Database Script
# This script sets up PostgreSQL locally and runs migrations

set -e

echo "🚀 Billboard Ads - Local Database Setup"
echo "========================================"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install it first:"
    echo "   macOS: brew install postgresql"
    echo "   Ubuntu: sudo apt-get install postgresql"
    echo "   Windows: Download from https://www.postgresql.org/download/windows/"
    exit 1
fi

echo "✅ PostgreSQL found"

# Check if PostgreSQL service is running
echo "Checking PostgreSQL service..."

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if ! pgrep -x "postgres" > /dev/null; then
        echo "⚠️  PostgreSQL is not running. Please start it:"
        echo "   brew services start postgresql"
        exit 1
    fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if ! sudo systemctl is-active --quiet postgresql; then
        echo "⚠️  PostgreSQL is not running. Please start it:"
        echo "   sudo systemctl start postgresql"
        exit 1
    fi
fi

echo "✅ PostgreSQL is running"

# Create database and user
echo ""
echo "Creating database and user..."

PSQL_CMD="psql -U postgres"

# Check if database exists
DB_EXISTS=$($PSQL_CMD -tAc "SELECT 1 FROM pg_databases WHERE datname = 'billboard_ads'")

if [ "$DB_EXISTS" = "1" ]; then
    echo "⚠️  Database 'billboard_ads' already exists. Skipping creation."
else
    echo "Creating database 'billboard_ads'..."
    $PSQL_CMD -c "CREATE DATABASE billboard_ads;"
    echo "✅ Database created"
fi

# Check if user exists
USER_EXISTS=$($PSQL_CMD -tAc "SELECT 1 FROM pg_user WHERE usename = 'postgres'")

if [ "$USER_EXISTS" = "1" ]; then
    echo "✅ User 'postgres' already exists"
else
    echo "Creating user 'postgres'..."
    $PSQL_CMD -c "CREATE USER postgres WITH PASSWORD 'postgres';"
    echo "✅ User created"
fi

# Grant privileges
echo "Granting privileges..."
$PSQL_CMD -c "ALTER USER postgres WITH SUPERUSER;"
echo "✅ Privileges granted"

# Update .env
echo ""
echo "Updating .env file..."

if [ -f ".env" ]; then
    # Backup existing .env
    cp .env .env.backup
    echo "✅ Created backup: .env.backup"
fi

# Create or update .env with local database URL
cat > .env << EOF
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/billboard_ads"
JWT_SECRET="dev-secret-key-change-in-production"
JWT_REFRESH_SECRET="dev-refresh-secret-change-in-production"
JWT_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"
NODE_ENV="development"
PORT=3001
API_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:3000"
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""
AWS_REGION="ap-south-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_S3_BUCKET="billboard-ads-bucket"
CLOUDINARY_NAME="your-cloudinary-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
RAZORPAY_KEY_ID="your-razorpay-key-id"
RAZORPAY_KEY_SECRET="your-razorpay-key-secret"
ADMIN_EMAIL="admin@billboard.local"
ADMIN_PASSWORD="ChangeMe@123"
MAX_FILE_SIZE=52428800
ALLOWED_IMAGE_TYPES="jpeg,jpg,png,webp"
ALLOWED_VIDEO_TYPES="mp4,webm,mov"
MAX_VIDEO_DURATION=60
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL="debug"
EOF

echo "✅ .env file created"

echo ""
echo "Database setup complete! 🎉"
echo ""
echo "Next steps:"
echo "1. npm install"
echo "2. npm run prisma:generate"
echo "3. npm run prisma:migrate"
echo "4. npm run start:dev"
echo ""
echo "For Prisma Studio: npm run prisma:studio"
