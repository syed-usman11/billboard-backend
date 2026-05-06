# Digital Billboard Advertising SaaS - Backend

Production-ready NestJS backend for digital billboard advertising platform.

## Tech Stack

- **Framework**: NestJS 10.x
- **Database**: PostgreSQL 16
- **ORM**: Prisma
- **Cache**: Redis
- **Auth**: JWT (Access + Refresh tokens)
- **Payment**: Razorpay
- **Media Storage**: AWS S3 / Cloudinary
- **Docker**: Docker & Docker Compose

## Project Structure

```
src/
├── modules/
│   ├── auth/              # Authentication & JWT
│   ├── users/             # User management
│   ├── media/             # Media upload & management
│   ├── plans/             # Ad plans
│   ├── addons/            # Add-ons
│   ├── campaigns/         # Campaign management
│   ├── slots/             # Billboard slots
│   ├── payments/          # Razorpay integration
│   ├── schedules/         # Scheduling engine
│   ├── admin/             # Admin dashboard APIs
│   ├── notifications/     # Notifications
│   └── audit-logs/        # Audit logging
├── common/
│   ├── prisma/            # Database connection
│   ├── decorators/        # Custom decorators
│   ├── guards/            # Auth guards
│   └── filters/           # Exception filters
├── app.module.ts
├── app.controller.ts
└── main.ts

prisma/
├── schema.prisma          # Database schema
└── seed.ts               # Database seeding
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd BACKEND
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

### 3. Setup Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed initial data
npm run prisma:seed
```

### 4. Start Development Server

```bash
npm run start:dev
```

Server will run on `http://localhost:3001`

## Using Docker

### Start Full Stack

```bash
docker-compose up -d
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- NestJS API (port 3001)

### View Logs

```bash
docker-compose logs -f backend
```

### Stop Services

```bash
docker-compose down
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Get current user

### Campaigns
- `GET /api/campaigns/my` - My campaigns
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns/:id` - Get campaign
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign
- `POST /api/campaigns/:id/submit-approval` - Submit for approval
- `POST /api/campaigns/:id/approve` - (Admin) Approve campaign
- `POST /api/campaigns/:id/reject` - (Admin) Reject campaign

### Media
- `POST /api/media/upload` - Upload media
- `GET /api/media` - My media
- `GET /api/media/:id` - Get media
- `DELETE /api/media/:id` - Delete media
- `POST /api/media/:id/approve` - (Admin) Approve media
- `POST /api/media/:id/reject` - (Admin) Reject media

### Payments
- `POST /api/payments/create-order` - Create Razorpay order
- `POST /api/payments/verify` - Verify payment
- `GET /api/payments/my` - My payments
- `GET /api/payments/campaign/:campaignId` - Campaign payment

### Schedules
- `GET /api/schedules/today` - Today's schedule
- `GET /api/schedules/by-date` - Schedule by date
- `GET /api/schedules/nova-lct` - Schedule for Nova LCT
- `GET /api/schedules/export/json` - Export as JSON
- `GET /api/schedules/export/csv` - Export as CSV
- `POST /api/schedules/campaign/:campaignId/generate` - (Admin) Generate schedule

### Admin Dashboard
- `GET /api/admin/dashboard` - Dashboard stats
- `GET /api/admin/campaigns` - All campaigns
- `GET /api/admin/payments` - All payments
- `GET /api/admin/slot-occupancy` - Slot occupancy
- `GET /api/admin/today-schedule` - Today's schedule
- `GET /api/admin/audit-logs` - Audit logs

## Database Schema

### Core Models
- **User**: Authentication & user info
- **Campaign**: Ad campaigns with status tracking
- **Media**: Uploaded images/videos with approval
- **Plan**: Advertising plans (50-900 plays/day)
- **Addon**: Additional features
- **Payment**: Razorpay payments
- **Slot**: Billboard time slots
- **Booking**: Campaign-to-slot assignments
- **Schedule**: Generated playback schedule
- **AuditLog**: Activity logging

## Key Features

### Security
- JWT authentication with access/refresh tokens
- Role-based access control (ADMIN/CUSTOMER)
- Password hashing with bcrypt
- Input validation with Zod
- Helmet for HTTP headers
- CORS protection

### Payment
- Razorpay integration
- Signature verification
- Webhook handling
- Transaction logging

### Scheduling Engine
- Automatic schedule generation
- Fair play distribution across slots
- Multi-day campaign support
- Schedule regeneration capability

### File Management
- Media upload validation
- Type checking (image/video)
- File size limits
- Cloudinary integration ready

## Environment Variables

```
DATABASE_URL                # PostgreSQL connection
JWT_SECRET                  # JWT signing key
JWT_REFRESH_SECRET         # Refresh token key
RAZORPAY_KEY_ID            # Razorpay key
RAZORPAY_KEY_SECRET        # Razorpay secret
CLOUDINARY_NAME            # Cloudinary account
CLOUDINARY_API_KEY         # Cloudinary API key
REDIS_HOST                 # Redis host
REDIS_PORT                 # Redis port
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

## Production Build

```bash
npm run build
npm run start:prod
```

## Deployment

### Contabo VPS Deployment

1. **Install Node.js & Dependencies**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs postgresql redis-server nginx
```

2. **Clone Repository & Setup**
```bash
git clone <repo> /home/app/billboard
cd /home/app/billboard/BACKEND
npm ci --only=production
```

3. **Database Setup**
```bash
psql -U postgres -d postgres -c "CREATE DATABASE billboard_ads;"
npm run prisma:migrate:prod
npm run prisma:seed
```

4. **Nginx Reverse Proxy** (`/etc/nginx/sites-available/api.billboard`)
```nginx
server {
    listen 80;
    server_name api.billboard.local;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

5. **SSL with Certbot**
```bash
sudo certbot certonly --nginx -d api.billboard.local
```

6. **PM2 Process Manager**
```bash
npm install -g pm2
pm2 start npm --name billboard-api -- run start:prod
pm2 startup
pm2 save
```

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL
psql -U postgres -d billboard_ads

# Reset database
npm run prisma:migrate:reset
```

### Clear Node Modules & Reinstall
```bash
rm -rf node_modules package-lock.json
npm install
```

## Support

For issues or questions, contact the development team.
