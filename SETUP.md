# Quick Setup Guide

Follow these steps to get your Comgini Backend up and running.

## Step 1: Install Dependencies

```bash
cd /Users/sitansujena/Documents/projects/2026/comgini/Comgini-Backend-Code
npm install
```

## Step 2: Configure Environment

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and update the following:

### Required Configuration:
```env
# Database - Update these with your PostgreSQL credentials
DB_HOST=localhost
DB_PORT=5432
DB_NAME=comgini_db
DB_USER=postgres
DB_PASSWORD=your_actual_password

# JWT Secrets - Generate strong random strings
JWT_SECRET=your_strong_random_secret_here
JWT_REFRESH_SECRET=your_strong_refresh_secret_here

# Email - Configure your email service
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_specific_password
```

### Generate Strong Secrets:
You can generate secure random strings using Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Step 3: Set Up PostgreSQL Database

### Option A: Using psql command line
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE comgini_db;

# Exit psql
\q
```

### Option B: Using createdb utility
```bash
createdb -U postgres comgini_db
```

## Step 4: Run Database Migrations

```bash
npm run migrate
```

You should see: `✅ Database migrations completed successfully`

## Step 5: Create a Test User (Optional)

You can create a test user by connecting to your database:

```bash
psql -U postgres -d comgini_db
```

Then run:
```sql
INSERT INTO users (email, password_hash, first_name, last_name, is_active, is_verified)
VALUES (
  'test@example.com',
  '$2a$10$YourHashedPasswordHere',
  'Test',
  'User',
  true,
  true
);
```

Or create a user through the API after starting the server (you'll need to implement a registration endpoint).

## Step 6: Start the Server

### Development mode (with auto-reload):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

You should see:
```
✅ Database connected successfully
✅ Database connection verified
🚀 Server is running on port 3000
📍 Environment: development
🔗 API Base URL: http://localhost:3000/api/v1
```

## Step 7: Test the API

### Test Health Endpoint:
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Test Login (if you created a test user):
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "YourPassword123!"
  }'
```

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running: `pg_isready`
- Check your database credentials in `.env`
- Ensure the database exists: `psql -U postgres -l`

### Email Issues
- For Gmail, you need to use an App Password, not your regular password
- Enable "Less secure app access" or use OAuth2
- Test email configuration separately

### Port Already in Use
If port 3000 is already in use, change the PORT in your `.env` file:
```env
PORT=3001
```

### Migration Errors
If migrations fail:
1. Check database connection
2. Verify PostgreSQL user has CREATE privileges
3. Try running the SQL manually from `src/database/schema.sql`

## Next Steps

1. **Create a Registration Endpoint** - Add user registration functionality
2. **Set Up Email Templates** - Customize the password reset email
3. **Add More Endpoints** - Extend the API with additional features
4. **Set Up Testing** - Write unit and integration tests
5. **Deploy** - Deploy to your production environment

## Production Checklist

Before deploying to production:

- [ ] Change all default secrets in `.env`
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper CORS origins
- [ ] Set up SSL/TLS certificates
- [ ] Configure production database
- [ ] Set up proper logging
- [ ] Configure email service
- [ ] Set up monitoring and alerts
- [ ] Review rate limiting settings
- [ ] Set up database backups
- [ ] Review security headers

## Support

If you encounter any issues, check:
1. The main README.md for detailed documentation
2. The error logs in your terminal
3. PostgreSQL logs for database issues
