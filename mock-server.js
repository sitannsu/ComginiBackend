const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
const PORT = process.env.MOCK_PORT || 3001;

// Mock data storage (in-memory)
const mockUsers = [
    {
        id: 1,
        email: 'test@example.com',
        password: 'Test123!@#', // In real app, this would be hashed
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        isActive: true,
        isVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        lastLogin: null
    },
    {
        id: 2,
        email: 'admin@comgini.com',
        password: 'Admin123!@#',
        firstName: 'Admin',
        lastName: 'User',
        phone: '+9876543210',
        isActive: true,
        isVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        lastLogin: null
    }
];

const mockResetTokens = new Map(); // Store reset tokens temporarily
const mockRefreshTokens = new Set(); // Store active refresh tokens

// JWT Secret for mock
const MOCK_JWT_SECRET = 'mock_jwt_secret_key_for_testing';
const MOCK_REFRESH_SECRET = 'mock_refresh_secret_key_for_testing';

// Middleware
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Helper function to generate JWT
const generateAccessToken = (user) => {
    return jwt.sign(
        { userId: user.id, email: user.email },
        MOCK_JWT_SECRET,
        { expiresIn: '24h' }
    );
};

const generateRefreshToken = (user) => {
    return jwt.sign(
        { userId: user.id },
        MOCK_REFRESH_SECRET,
        { expiresIn: '7d' }
    );
};

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token is required'
        });
    }

    try {
        const decoded = jwt.verify(token, MOCK_JWT_SECRET);
        const user = mockUsers.find(u => u.id === decoded.userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'User account is deactivated'
            });
        }

        req.user = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Mock server is running',
        timestamp: new Date().toISOString(),
        mode: 'MOCK'
    });
});

// 1. Login endpoint
app.post('/api/v1/auth/login', (req, res) => {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Email and password are required'
        });
    }

    // Find user
    const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
        return res.status(401).json({
            success: false,
            message: 'Invalid email or password'
        });
    }

    // Check password (in mock, we compare directly)
    if (user.password !== password) {
        return res.status(401).json({
            success: false,
            message: 'Invalid email or password'
        });
    }

    // Check if active
    if (!user.isActive) {
        return res.status(401).json({
            success: false,
            message: 'Your account has been deactivated'
        });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token
    mockRefreshTokens.add(refreshToken);

    // Update last login
    user.lastLogin = new Date().toISOString();

    // Success response
    res.json({
        success: true,
        message: 'Login successful',
        data: {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone
            },
            accessToken,
            refreshToken
        }
    });
});

// 2. Forgot Password endpoint
app.post('/api/v1/auth/forgot-password', (req, res) => {
    const { email } = req.body;

    // Validation
    if (!email) {
        return res.status(400).json({
            success: false,
            message: 'Email is required'
        });
    }

    // Find user (but don't reveal if user exists)
    const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (user) {
        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);

        // Store token
        mockResetTokens.set(resetToken, {
            userId: user.id,
            email: user.email,
            expiresAt: expiresAt.toISOString(),
            used: false
        });

        console.log('\n📧 Password Reset Email (Mock):');
        console.log('To:', user.email);
        console.log('Reset Token:', resetToken);
        console.log('Reset URL:', `http://localhost:3000/reset-password?token=${resetToken}`);
        console.log('Expires:', expiresAt.toISOString());
        console.log('\n');
    }

    // Always return success to prevent email enumeration
    res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent'
    });
});

// 3. Reset Password endpoint
app.post('/api/v1/auth/reset-password', (req, res) => {
    const { token, newPassword } = req.body;

    // Validation
    if (!token || !newPassword) {
        return res.status(400).json({
            success: false,
            message: 'Token and new password are required'
        });
    }

    // Password strength validation
    if (newPassword.length < 8) {
        return res.status(400).json({
            success: false,
            message: 'Password must be at least 8 characters long'
        });
    }

    // Find token
    const resetData = mockResetTokens.get(token);

    if (!resetData) {
        return res.status(400).json({
            success: false,
            message: 'Invalid or expired reset token'
        });
    }

    // Check if token is expired
    if (new Date() > new Date(resetData.expiresAt)) {
        mockResetTokens.delete(token);
        return res.status(400).json({
            success: false,
            message: 'Invalid or expired reset token'
        });
    }

    // Check if token is already used
    if (resetData.used) {
        return res.status(400).json({
            success: false,
            message: 'Invalid or expired reset token'
        });
    }

    // Find user and update password
    const user = mockUsers.find(u => u.id === resetData.userId);

    if (!user) {
        return res.status(400).json({
            success: false,
            message: 'User not found'
        });
    }

    // Update password
    user.password = newPassword;

    // Mark token as used
    resetData.used = true;

    // Revoke all refresh tokens for security
    // In a real app, you'd revoke tokens for this specific user
    mockRefreshTokens.clear();

    console.log('\n✅ Password Reset Successful (Mock):');
    console.log('User:', user.email);
    console.log('New Password:', newPassword);
    console.log('\n');

    res.json({
        success: true,
        message: 'Password has been reset successfully'
    });
});

// 4. Logout endpoint
app.post('/api/v1/auth/logout', authenticateToken, (req, res) => {
    // In a real app, you'd revoke the specific refresh token
    // For mock, we'll just clear all tokens
    mockRefreshTokens.clear();

    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// 5. Get Profile endpoint
app.get('/api/v1/auth/profile', authenticateToken, (req, res) => {
    const user = mockUsers.find(u => u.id === req.user.id);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    res.json({
        success: true,
        data: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            isVerified: user.isVerified,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log('\n🎭 ================================');
    console.log('🎭  MOCK API SERVER RUNNING');
    console.log('🎭 ================================');
    console.log(`🚀 Server: http://localhost:${PORT}`);
    console.log(`🔗 API Base: http://localhost:${PORT}/api/v1`);
    console.log(`📍 Mode: MOCK (No Database Required)`);
    console.log('\n📝 Mock Users:');
    mockUsers.forEach(user => {
        console.log(`   - ${user.email} / ${user.password}`);
    });
    console.log('\n✅ All endpoints ready for testing!');
    console.log('🎭 ================================\n');
});
