# 🎭 Mock API - Quick Reference

## Start Mock Server

```bash
npm run mock
```

Server runs on: **http://localhost:3001**

## Test Users

| Email | Password |
|-------|----------|
| `test@example.com` | `Test123!@#` |
| `admin@comgini.com` | `Admin123!@#` |

## Quick Test Commands

### 1. Health Check
```bash
curl http://localhost:3001/health
```

### 2. Login
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}'
```

### 3. Get Profile (after login)
```bash
# First login and save token
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}' \
  | jq -r '.data.accessToken')

# Then get profile
curl -X GET http://localhost:3001/api/v1/auth/profile \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Forgot Password
```bash
curl -X POST http://localhost:3001/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Check server console for reset token
```

### 5. Reset Password
```bash
curl -X POST http://localhost:3001/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN_FROM_CONSOLE","newPassword":"NewPass123!"}'
```

### 6. Logout
```bash
curl -X POST http://localhost:3001/api/v1/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

## All Endpoints

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| GET | `/health` | ❌ |
| POST | `/api/v1/auth/login` | ❌ |
| POST | `/api/v1/auth/forgot-password` | ❌ |
| POST | `/api/v1/auth/reset-password` | ❌ |
| GET | `/api/v1/auth/profile` | ✅ |
| POST | `/api/v1/auth/logout` | ✅ |

## Features

✅ No database required  
✅ Instant setup  
✅ Real JWT tokens  
✅ Console email logs  
✅ Perfect for frontend dev  

## Postman Collection

Import: `Comgini-Mock-API.postman_collection.json`

## Full Documentation

See: `MOCK_API_GUIDE.md`
