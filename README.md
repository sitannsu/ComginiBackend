# Comgini Backend API

A secure and scalable authentication backend built with Node.js, Express, and PostgreSQL.

## Features

- ✅ User Authentication (Login/Logout)
- ✅ Password Reset Flow (Forgot/Reset Password)
- ✅ JWT Token-based Authentication
- ✅ Refresh Token Rotation
- ✅ Rate Limiting
- ✅ Input Validation
- ✅ Audit Logging
- ✅ Email Notifications
- ✅ Security Best Practices (Helmet, CORS, bcrypt)

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Email**: Nodemailer
- **Validation**: express-validator
- **Security**: Helmet, CORS, Rate Limiting

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   cd /Users/sitansujena/Documents/projects/2026/comgini/Comgini-Backend-Code
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration:
   - Database credentials
   - JWT secrets
   - Email configuration
   - CORS settings

4. **Create PostgreSQL database**
   ```bash
   createdb comgini_db
   ```

5. **Run database migrations**
   ```bash
   npm run migrate
   ```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

## 🎭 Mock API (No Database Required)

**Want to test the API without setting up a database?** Use the Mock API server!

```bash
npm run mock
```

The mock server runs on `http://localhost:3001` with:
- ✅ All 5 authentication endpoints
- ✅ Pre-loaded test users
- ✅ Real JWT tokens
- ✅ No database required
- ✅ Perfect for frontend development

**Test Users:**
- `test@example.com` / `Test123!@#`
- `admin@comgini.com` / `Admin123!@#`

**Quick Test:**
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}'
```

📖 **Full Documentation:** See [MOCK_API_GUIDE.md](MOCK_API_GUIDE.md) and [MOCK_QUICK_START.md](MOCK_QUICK_START.md)


## API Endpoints

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/auth/login` | Authenticate user | Public |
| POST | `/auth/forgot-password` | Initiate password reset | Public |
| POST | `/auth/reset-password` | Reset password with token | Public |
| POST | `/auth/logout` | Logout user | Private |
| GET | `/auth/profile` | Get user profile | Private |

### API Documentation

#### 1. Login
**POST** `/api/v1/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "YourPassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 2. Forgot Password
**POST** `/api/v1/auth/forgot-password`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset link has been sent"
}
```

#### 3. Reset Password
**POST** `/api/v1/auth/reset-password`

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "newPassword": "NewPassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password has been reset successfully"
}
```

#### 4. Logout
**POST** `/api/v1/auth/logout`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### 5. Get Profile
**GET** `/api/v1/auth/profile`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "isVerified": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastLogin": "2024-01-15T10:30:00.000Z"
  }
}
```

## Database Schema

### Tables

1. **users** - User account information
2. **password_reset_tokens** - Password reset tokens
3. **refresh_tokens** - JWT refresh tokens
4. **auth_audit_log** - Authentication event logging

## Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Secure token-based auth
- **Rate Limiting**: Prevents brute force attacks
- **Input Validation**: Validates all user inputs
- **SQL Injection Protection**: Parameterized queries
- **CORS**: Configurable cross-origin requests
- **Helmet**: Security headers
- **Audit Logging**: Tracks all auth events

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Valid email is required"
    }
  ]
}
```

## Testing

You can test the API using:
- Postman
- cURL
- Thunder Client (VS Code extension)

Example cURL request:
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"YourPassword123!"}'
```

## Project Structure

```
Comgini-Backend-Code/
├── src/
│   ├── config/
│   │   ├── database.js       # PostgreSQL configuration
│   │   └── email.js          # Email transporter setup
│   ├── controllers/
│   │   └── authController.js # Authentication logic
│   ├── database/
│   │   ├── schema.sql        # Database schema
│   │   └── migrate.js        # Migration script
│   ├── middleware/
│   │   ├── auth.js           # JWT authentication
│   │   ├── validation.js     # Input validation
│   │   └── rateLimiter.js    # Rate limiting
│   ├── routes/
│   │   └── authRoutes.js     # API routes
│   ├── utils/
│   │   ├── email.js          # Email utilities
│   │   └── logger.js         # Audit logging
│   ├── app.js                # Express app setup
│   └── server.js             # Server entry point
├── .env.example              # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## Environment Variables

See `.env.example` for all required environment variables.

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

ISC

## Support

For issues or questions, please contact the development team.
