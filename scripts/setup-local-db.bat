@echo off
REM Setup Local Database Script for Windows
REM This script sets up PostgreSQL locally and runs migrations

echo.
echo 🚀 Billboard Ads - Local Database Setup (Windows)
echo ====================================================
echo.

REM Check if PostgreSQL is installed
where psql >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ PostgreSQL is not installed or not in PATH.
    echo Please install it from: https://www.postgresql.org/download/windows/
    echo And add PostgreSQL bin folder to your system PATH
    exit /b 1
)

echo ✅ PostgreSQL found

REM Test connection (assumes default password is 'postgres')
psql -U postgres -c "SELECT 1;" >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Cannot connect to PostgreSQL
    echo Make sure PostgreSQL is running and the password is correct
    echo Default: User: postgres, Password: postgres
    exit /b 1
)

echo ✅ PostgreSQL is accessible

REM Create database
echo.
echo Creating database and user...

psql -U postgres -c "CREATE DATABASE billboard_ads;" 2>nul
if %errorlevel% equ 0 (
    echo ✅ Database 'billboard_ads' created
) else (
    echo ⚠️  Database 'billboard_ads' already exists
)

REM Grant privileges
psql -U postgres -c "ALTER USER postgres WITH SUPERUSER;" 2>nul
echo ✅ Privileges granted

REM Create .env file
echo.
echo Creating .env file...

(
    echo DATABASE_URL=postgresql://postgres:postgres@localhost:5432/billboard_ads
    echo JWT_SECRET=dev-secret-key-change-in-production
    echo JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
    echo JWT_EXPIRATION=15m
    echo JWT_REFRESH_EXPIRATION=7d
    echo NODE_ENV=development
    echo PORT=3001
    echo API_URL=http://localhost:3001
    echo FRONTEND_URL=http://localhost:3000
    echo REDIS_HOST=localhost
    echo REDIS_PORT=6379
    echo REDIS_PASSWORD=
    echo AWS_REGION=ap-south-1
    echo AWS_ACCESS_KEY_ID=your-access-key
    echo AWS_SECRET_ACCESS_KEY=your-secret-key
    echo AWS_S3_BUCKET=billboard-ads-bucket
    echo CLOUDINARY_NAME=your-cloudinary-name
    echo CLOUDINARY_API_KEY=your-api-key
    echo CLOUDINARY_API_SECRET=your-api-secret
    echo RAZORPAY_KEY_ID=your-razorpay-key-id
    echo RAZORPAY_KEY_SECRET=your-razorpay-key-secret
    echo ADMIN_EMAIL=admin@billboard.local
    echo ADMIN_PASSWORD=ChangeMe@123
    echo MAX_FILE_SIZE=52428800
    echo ALLOWED_IMAGE_TYPES=jpeg,jpg,png,webp
    echo ALLOWED_VIDEO_TYPES=mp4,webm,mov
    echo MAX_VIDEO_DURATION=60
    echo RATE_LIMIT_WINDOW_MS=900000
    echo RATE_LIMIT_MAX_REQUESTS=100
    echo LOG_LEVEL=debug
) > .env

echo ✅ .env file created

echo.
echo Database setup complete! 🎉
echo.
echo Next steps:
echo 1. npm install
echo 2. npm run prisma:generate
echo 3. npm run prisma:migrate
echo 4. npm run start:dev
echo.
echo For Prisma Studio: npm run prisma:studio
echo.
pause
