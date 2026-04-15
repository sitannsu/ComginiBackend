const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/database');
const { logAuthEvent } = require('../utils/logger');
const { sendPasswordResetEmail } = require('../utils/email');

/**
 * Login Controller
 * POST /api/v1/auth/login
 */
const login = async (req, res) => {
    const client = await pool.getConnection();

    try {
        const { email, password } = req.body;

        // Find user by email
        const [userRows] = await client.query(
            'SELECT * FROM users WHERE email = ?',
            [email.toLowerCase()]
        );

        if (userRows.length === 0) {
            await logAuthEvent(null, 'LOGIN_FAILED', req, false, 'User not found');
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = userRows[0];

        // Check if user is active
        if (!user.is_active) {
            await logAuthEvent(user.id, 'LOGIN_FAILED', req, false, 'Account deactivated');
            return res.status(401).json({
                success: false,
                message: 'Your account has been deactivated'
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            await logAuthEvent(user.id, 'LOGIN_FAILED', req, false, 'Invalid password');
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate JWT tokens
        const accessToken = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        const refreshToken = jwt.sign(
            { userId: user.id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
        );

        // Store refresh token in database
        const refreshTokenExpiry = new Date();
        refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);

        await client.query(
            `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES (?, ?, ?)`,
            [user.id, refreshToken, refreshTokenExpiry]
        );

        // Update last login
        await client.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            [user.id]
        );

        // Log successful login
        await logAuthEvent(user.id, 'LOGIN_SUCCESS', req, true);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    phone: user.phone
                },
                accessToken,
                refreshToken
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred during login'
        });
    } finally {
        client.release();
    }
};

/**
 * Register Controller
 * POST /api/v1/auth/register
 */
const register = async (req, res) => {
    const client = await pool.getConnection();

    try {
        const { email, password, firstName, lastName, phone, role } = req.body;

        // Check if user already exists
        const [existingUsers] = await client.query(
            'SELECT id FROM users WHERE email = ?',
            [email.toLowerCase()]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Insert new user
        const userRole = role || 'employee'; // default to employee
        const [result] = await client.query(
            `INSERT INTO users (email, password_hash, first_name, last_name, phone, role)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [email.toLowerCase(), passwordHash, firstName, lastName, phone, userRole]
        );

        // Generate JWT tokens
        const accessToken = jwt.sign(
            { userId: result.insertId, email: email.toLowerCase() },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        const refreshToken = jwt.sign(
            { userId: result.insertId },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
        );

        // Store refresh token in database
        const refreshTokenExpiry = new Date();
        refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);

        await client.query(
            `INSERT INTO refresh_tokens (user_id, token, expires_at)
             VALUES (?, ?, ?)`,
            [result.insertId, refreshToken, refreshTokenExpiry]
        );

        // Log successful registration
        await logAuthEvent(result.insertId, 'REGISTER_SUCCESS', req, true);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: result.insertId,
                    email: email.toLowerCase(),
                    firstName,
                    lastName,
                    phone,
                    role: userRole
                },
                accessToken,
                refreshToken
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred during registration'
        });
    } finally {
        client.release();
    }
};

/**
 * Forgot Password Controller
 * POST /api/v1/auth/forgot-password
 */
const forgotPassword = async (req, res) => {
    const client = await pool.getConnection();

    try {
        const { email } = req.body;

        // Find user by email
        const [userRows] = await client.query(
            'SELECT id, email, first_name, last_name FROM users WHERE email = ?',
            [email.toLowerCase()]
        );

        // Always return success to prevent email enumeration
        if (userRows.length === 0) {
            return res.json({
                success: true,
                message: 'If an account exists with this email, a password reset link has been sent'
            });
        }

        const user = userRows[0];

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        // Set token expiry (1 hour from now)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);

        // Invalidate any existing reset tokens for this user
        await client.query(
            'UPDATE password_reset_tokens SET used = true WHERE user_id = ? AND used = false',
            [user.id]
        );

        // Store hashed token in database
        await client.query(
            `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES (?, ?, ?)`,
            [user.id, hashedToken, expiresAt]
        );

        // Send password reset email
        await sendPasswordResetEmail(
            user.email,
            resetToken,
            user.first_name || user.email
        );

        // Log event
        await logAuthEvent(user.id, 'PASSWORD_RESET_REQUESTED', req, true);

        res.json({
            success: true,
            message: 'If an account exists with this email, a password reset link has been sent'
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while processing your request'
        });
    } finally {
        client.release();
    }
};

/**
 * Reset Password Controller
 * POST /api/v1/auth/reset-password
 */
const resetPassword = async (req, res) => {
    const client = await pool.getConnection();

    try {
        const { token, newPassword } = req.body;

        // Hash the token to match database
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Find valid reset token
        const [tokenRows] = await client.query(
            `SELECT prt.*, u.id as user_id, u.email
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = ? 
       AND prt.used = false 
       AND prt.expires_at > CURRENT_TIMESTAMP`,
            [hashedToken]
        );

        if (tokenRows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        const resetData = tokenRows[0];

        // Hash new password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update user password
        await client.query(
            'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [passwordHash, resetData.user_id]
        );

        // Mark token as used
        await client.query(
            'UPDATE password_reset_tokens SET used = true WHERE id = ?',
            [resetData.id]
        );

        // Revoke all existing refresh tokens for security
        await client.query(
            'UPDATE refresh_tokens SET is_revoked = true, revoked_at = CURRENT_TIMESTAMP WHERE user_id = ?',
            [resetData.user_id]
        );

        // Log event
        await logAuthEvent(resetData.user_id, 'PASSWORD_RESET_SUCCESS', req, true);

        res.json({
            success: true,
            message: 'Password has been reset successfully'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while resetting your password'
        });
    } finally {
        client.release();
    }
};

/**
 * Logout Controller
 * POST /api/v1/auth/logout
 */
const logout = async (req, res) => {
    const client = await pool.getConnection();

    try {
        const userId = req.user.id;

        // Revoke all refresh tokens for this user
        await client.query(
            'UPDATE refresh_tokens SET is_revoked = true, revoked_at = CURRENT_TIMESTAMP WHERE user_id = ? AND is_revoked = false',
            [userId]
        );

        // Log event
        await logAuthEvent(userId, 'LOGOUT_SUCCESS', req, true);

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred during logout'
        });
    } finally {
        client.release();
    }
};

/**
 * Get Profile Controller
 * GET /api/v1/auth/profile
 */
const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const [userRows] = await pool.query(
            `SELECT id, email, first_name, last_name, phone, avatar, gender, company_name, gst_number,
              is_verified, created_at, last_login
       FROM users WHERE id = ?`,
            [userId]
        );

        if (userRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = userRows[0];

        res.json({
            success: true,
            data: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                phone: user.phone,
                avatar: user.avatar || 'blue',
                gender: user.gender,
                companyName: user.company_name,
                gstNumber: user.gst_number,
                isVerified: user.is_verified,
                createdAt: user.created_at,
                lastLogin: user.last_login
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching profile'
        });
    }
};

/**
 * GET /api/auth/me — frontend contract (string id)
 */
const getMe = async (req, res) => {
    try {
        const userId = req.user.id;
        const [userRows] = await pool.query(
            `SELECT id, email, first_name, last_name, phone, avatar, gender FROM users WHERE id = ?`,
            [userId]
        );
        if (userRows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const user = userRows[0];
        res.json({
            success: true,
            data: {
                id: `user_${user.id}`,
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                phone: user.phone,
                avatar: user.avatar || 'blue',
                gender: user.gender
            }
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ success: false, message: 'An error occurred while fetching user' });
    }
};

module.exports = {
    login,
    register,
    forgotPassword,
    resetPassword,
    logout,
    getProfile,
    getMe
};
