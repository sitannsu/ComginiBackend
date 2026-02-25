# API Flow Documentation

## Authentication Flow Diagrams

### 1. Login Flow
```
┌─────────┐                ┌─────────┐                ┌──────────┐
│ Client  │                │  API    │                │ Database │
└────┬────┘                └────┬────┘                └────┬─────┘
     │                          │                          │
     │ POST /auth/login         │                          │
     │ {email, password}        │                          │
     ├─────────────────────────>│                          │
     │                          │                          │
     │                          │ Query user by email      │
     │                          ├─────────────────────────>│
     │                          │                          │
     │                          │ User data                │
     │                          │<─────────────────────────┤
     │                          │                          │
     │                          │ Verify password (bcrypt) │
     │                          │                          │
     │                          │ Generate JWT tokens      │
     │                          │                          │
     │                          │ Store refresh token      │
     │                          ├─────────────────────────>│
     │                          │                          │
     │                          │ Update last_login        │
     │                          ├─────────────────────────>│
     │                          │                          │
     │                          │ Log auth event           │
     │                          ├─────────────────────────>│
     │                          │                          │
     │ 200 OK                   │                          │
     │ {user, accessToken,      │                          │
     │  refreshToken}           │                          │
     │<─────────────────────────┤                          │
     │                          │                          │
```

### 2. Forgot Password Flow
```
┌─────────┐                ┌─────────┐                ┌──────────┐                ┌───────┐
│ Client  │                │  API    │                │ Database │                │ Email │
└────┬────┘                └────┬────┘                └────┬─────┘                └───┬───┘
     │                          │                          │                          │
     │ POST /auth/forgot-password│                         │                          │
     │ {email}                  │                          │                          │
     ├─────────────────────────>│                          │                          │
     │                          │                          │                          │
     │                          │ Find user by email       │                          │
     │                          ├─────────────────────────>│                          │
     │                          │                          │                          │
     │                          │ User data                │                          │
     │                          │<─────────────────────────┤                          │
     │                          │                          │                          │
     │                          │ Generate reset token     │                          │
     │                          │ (crypto.randomBytes)     │                          │
     │                          │                          │                          │
     │                          │ Invalidate old tokens    │                          │
     │                          ├─────────────────────────>│                          │
     │                          │                          │                          │
     │                          │ Store hashed token       │                          │
     │                          ├─────────────────────────>│                          │
     │                          │                          │                          │
     │                          │ Send reset email         │                          │
     │                          ├──────────────────────────┼─────────────────────────>│
     │                          │                          │                          │
     │ 200 OK                   │                          │                          │
     │ {success message}        │                          │                          │
     │<─────────────────────────┤                          │                          │
     │                          │                          │                          │
```

### 3. Reset Password Flow
```
┌─────────┐                ┌─────────┐                ┌──────────┐
│ Client  │                │  API    │                │ Database │
└────┬────┘                └────┬────┘                └────┬─────┘
     │                          │                          │
     │ POST /auth/reset-password│                          │
     │ {token, newPassword}     │                          │
     ├─────────────────────────>│                          │
     │                          │                          │
     │                          │ Verify token             │
     │                          ├─────────────────────────>│
     │                          │                          │
     │                          │ Token data               │
     │                          │<─────────────────────────┤
     │                          │                          │
     │                          │ Hash new password        │
     │                          │ (bcrypt)                 │
     │                          │                          │
     │                          │ Update user password     │
     │                          ├─────────────────────────>│
     │                          │                          │
     │                          │ Mark token as used       │
     │                          ├─────────────────────────>│
     │                          │                          │
     │                          │ Revoke refresh tokens    │
     │                          ├─────────────────────────>│
     │                          │                          │
     │ 200 OK                   │                          │
     │ {success message}        │                          │
     │<─────────────────────────┤                          │
     │                          │                          │
```

### 4. Get Profile Flow
```
┌─────────┐                ┌─────────┐                ┌──────────┐
│ Client  │                │  API    │                │ Database │
└────┬────┘                └────┬────┘                └────┬─────┘
     │                          │                          │
     │ GET /auth/profile        │                          │
     │ Authorization: Bearer    │                          │
     ├─────────────────────────>│                          │
     │                          │                          │
     │                          │ Verify JWT token         │
     │                          │                          │
     │                          │ Check user exists        │
     │                          ├─────────────────────────>│
     │                          │                          │
     │                          │ User data                │
     │                          │<─────────────────────────┤
     │                          │                          │
     │ 200 OK                   │                          │
     │ {user profile}           │                          │
     │<─────────────────────────┤                          │
     │                          │                          │
```

### 5. Logout Flow
```
┌─────────┐                ┌─────────┐                ┌──────────┐
│ Client  │                │  API    │                │ Database │
└────┬────┘                └────┬────┘                └────┬─────┘
     │                          │                          │
     │ POST /auth/logout        │                          │
     │ Authorization: Bearer    │                          │
     ├─────────────────────────>│                          │
     │                          │                          │
     │                          │ Verify JWT token         │
     │                          │                          │
     │                          │ Revoke refresh tokens    │
     │                          ├─────────────────────────>│
     │                          │                          │
     │                          │ Log logout event         │
     │                          ├─────────────────────────>│
     │                          │                          │
     │ 200 OK                   │                          │
     │ {success message}        │                          │
     │<─────────────────────────┤                          │
     │                          │                          │
```

## Middleware Chain

### Public Endpoints (Login, Forgot Password, Reset Password)
```
Request
   │
   ├─> Rate Limiter (authLimiter/passwordResetLimiter)
   │
   ├─> Input Validation (express-validator)
   │
   ├─> Controller (Business Logic)
   │
   └─> Response
```

### Protected Endpoints (Profile, Logout)
```
Request
   │
   ├─> Rate Limiter (generalLimiter)
   │
   ├─> JWT Authentication (authenticateToken)
   │
   ├─> Controller (Business Logic)
   │
   └─> Response
```

## Security Layers

```
┌─────────────────────────────────────────────────────┐
│                    Client Request                    │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              Helmet (Security Headers)               │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│                   CORS Validation                    │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│                   Rate Limiting                      │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              Input Validation (if POST)              │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│         JWT Authentication (if protected)            │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│                  Controller Logic                    │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              Database (Parameterized)                │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│                  Audit Logging                       │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│                      Response                        │
└─────────────────────────────────────────────────────┘
```

## Database Relationships

```
┌─────────────────────┐
│       users         │
│─────────────────────│
│ id (PK)             │
│ email (UNIQUE)      │
│ password_hash       │
│ first_name          │
│ last_name           │
│ phone               │
│ is_active           │
│ is_verified         │
│ created_at          │
│ updated_at          │
│ last_login          │
└──────────┬──────────┘
           │
           │ 1:N
           │
    ┌──────┴──────┬──────────────┬────────────────┐
    │             │              │                │
    ▼             ▼              ▼                ▼
┌───────────┐ ┌────────────┐ ┌──────────┐ ┌──────────────┐
│  refresh  │ │  password  │ │   auth   │ │   (other)    │
│  tokens   │ │   reset    │ │  audit   │ │   tables     │
│           │ │   tokens   │ │   log    │ │              │
└───────────┘ └────────────┘ └──────────┘ └──────────────┘
```

## Token Lifecycle

### Access Token
```
Login
  │
  ├─> Generate JWT (24h expiry)
  │
  ├─> Return to client
  │
  ├─> Client stores in memory/localStorage
  │
  ├─> Client sends in Authorization header
  │
  └─> Expires after 24h (or on logout)
```

### Refresh Token
```
Login
  │
  ├─> Generate JWT (7d expiry)
  │
  ├─> Store in database
  │
  ├─> Return to client
  │
  ├─> Client stores securely
  │
  ├─> Use to get new access token
  │
  └─> Revoked on logout or password reset
```

### Password Reset Token
```
Forgot Password
  │
  ├─> Generate random token (crypto)
  │
  ├─> Hash token (SHA-256)
  │
  ├─> Store hashed version in DB (1h expiry)
  │
  ├─> Send plain token via email
  │
  ├─> User clicks link with token
  │
  ├─> Verify token (hash and compare)
  │
  └─> Mark as used after password reset
```
