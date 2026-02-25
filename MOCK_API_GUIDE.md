# 🎭 Mock API Server Guide

## What is the Mock API?

The Mock API is a **standalone server** that simulates all authentication endpoints **without requiring a database**. It's perfect for:

- ✅ Frontend development
- ✅ API testing
- ✅ Quick prototyping
- ✅ Demo purposes
- ✅ Learning the API structure

## Key Features

- 🚀 **No Database Required** - Uses in-memory storage
- 🎯 **Identical API Structure** - Same endpoints as the real API
- 🔐 **JWT Authentication** - Real JWT tokens
- 📧 **Console Email Logs** - See password reset tokens in console
- 👥 **Pre-loaded Test Users** - Ready to use
- ⚡ **Instant Setup** - No configuration needed

## Quick Start

### 1. Start the Mock Server

```bash
# From the project root
node mock-server.js
```

The server will start on **http://localhost:3001** (or set `MOCK_PORT` environment variable)

### 2. Test Users

The mock server comes with pre-loaded users:

| Email | Password | Name |
|-------|----------|------|
| `test@example.com` | `Test123!@#` | John Doe |
| `admin@comgini.com` | `Admin123!@#` | Admin User |

## API Endpoints

All endpoints are identical to the real API:

### Base URL
```
http://localhost:3001/api/v1
```

### 1. Health Check
```bash
GET /health
```

**Response:**
```json
{
  "success": true,
  "message": "Mock server is running",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "mode": "MOCK"
}
```

### 2. Login
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Test123!@#"
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
      "email": "test@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 3. Forgot Password
```bash
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "test@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset link has been sent"
}
```

**Note:** The reset token will be printed in the server console:
```
📧 Password Reset Email (Mock):
To: test@example.com
Reset Token: a1b2c3d4e5f6...
Reset URL: http://localhost:3000/reset-password?token=a1b2c3d4e5f6...
Expires: 2024-01-15T11:30:00.000Z
```

### 4. Reset Password
```bash
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "token": "a1b2c3d4e5f6...",
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

### 5. Get Profile
```bash
GET /api/v1/auth/profile
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "test@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "isVerified": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastLogin": "2024-01-15T10:30:00.000Z"
  }
}
```

### 6. Logout
```bash
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Testing with cURL

### Login Example
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'
```

### Get Profile Example
```bash
# First, login and save the token
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}' \
  | jq -r '.data.accessToken')

# Then use the token to get profile
curl -X GET http://localhost:3001/api/v1/auth/profile \
  -H "Authorization: Bearer $TOKEN"
```

### Forgot Password Example
```bash
curl -X POST http://localhost:3001/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'

# Check the server console for the reset token
```

### Reset Password Example
```bash
curl -X POST http://localhost:3001/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_RESET_TOKEN_FROM_CONSOLE",
    "newPassword": "NewPassword123!"
  }'
```

## Testing with Postman

1. **Import the Postman Collection**
   - Use `Comgini-API.postman_collection.json`

2. **Update Base URL**
   - Change the `base_url` variable to `http://localhost:3001`

3. **Test All Endpoints**
   - The collection will automatically save tokens
   - Use the pre-loaded test user credentials

## Differences from Real API

| Feature | Mock API | Real API |
|---------|----------|----------|
| Database | ❌ In-memory | ✅ PostgreSQL |
| Email | 📝 Console logs | 📧 Real emails |
| Password Hashing | ❌ Plain text | ✅ bcrypt |
| Data Persistence | ❌ Lost on restart | ✅ Permanent |
| Rate Limiting | ❌ None | ✅ Enabled |
| Audit Logging | ❌ None | ✅ Database logs |

## Use Cases

### 1. Frontend Development
Start the mock server while developing your frontend:
```bash
# Terminal 1: Mock API
node mock-server.js

# Terminal 2: Your Frontend
npm run dev
```

### 2. API Testing
Test your API integration without database setup:
```bash
node mock-server.js
# Run your tests against http://localhost:3001
```

### 3. Demos
Show the API functionality without infrastructure:
```bash
node mock-server.js
# Demo the endpoints to stakeholders
```

### 4. Learning
Understand the API structure and responses:
```bash
node mock-server.js
# Experiment with different requests
```

## Running Both Servers

You can run both the mock and real API simultaneously:

```bash
# Terminal 1: Real API (port 3000)
npm run dev

# Terminal 2: Mock API (port 3001)
node mock-server.js
```

Then switch between them by changing the base URL in your client.

## Adding More Mock Users

Edit `mock-server.js` and add to the `mockUsers` array:

```javascript
const mockUsers = [
  // Existing users...
  {
    id: 3,
    email: 'newuser@example.com',
    password: 'Password123!',
    firstName: 'New',
    lastName: 'User',
    phone: '+1111111111',
    isActive: true,
    isVerified: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    lastLogin: null
  }
];
```

## Customizing the Port

```bash
# Use a different port
MOCK_PORT=4000 node mock-server.js
```

Or set it in your environment:
```bash
export MOCK_PORT=4000
node mock-server.js
```

## Limitations

- ⚠️ **No Data Persistence** - All data is lost when server restarts
- ⚠️ **No Real Emails** - Reset tokens shown in console only
- ⚠️ **Simplified Security** - Passwords stored in plain text
- ⚠️ **No Rate Limiting** - Unlimited requests allowed
- ⚠️ **No Audit Logs** - No tracking of authentication events

## When to Use Which Server

### Use Mock API When:
- ✅ Developing frontend
- ✅ Testing API integration
- ✅ Quick prototyping
- ✅ No database available
- ✅ Demonstrating functionality

### Use Real API When:
- ✅ Production deployment
- ✅ Data persistence needed
- ✅ Security is critical
- ✅ Email functionality required
- ✅ Audit logging needed

## Troubleshooting

### Port Already in Use
```bash
# Change the port
MOCK_PORT=3002 node mock-server.js
```

### Token Expired
- Login again to get a new token
- Tokens expire after 24 hours

### Reset Token Not Found
- Check the server console for the token
- Tokens expire after 1 hour
- Each token can only be used once

## Tips

1. **Keep Console Open** - Watch for reset tokens and logs
2. **Save Tokens** - Copy access tokens for testing protected endpoints
3. **Test Error Cases** - Try invalid credentials, expired tokens, etc.
4. **Compare Responses** - Ensure your client handles both mock and real API

## Next Steps

1. Start the mock server: `node mock-server.js`
2. Test with Postman or cURL
3. Integrate with your frontend
4. Switch to real API when ready for production

---

**Happy Testing! 🎭**
