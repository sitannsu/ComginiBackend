const jwt = require('jsonwebtoken');
const pool = require('../config/database');

/**
 * Middleware to verify JWT token and authenticate user
 */
const authenticateToken = async (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token is required'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if user still exists and is active
        const [userRows] = await pool.query(
            'SELECT id, email, first_name, last_name, is_active FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (userRows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = userRows[0];

        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'User account is deactivated'
            });
        }

        // Attach user to request object
        req.user = {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name
        };

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }

        console.error('Authentication error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};

module.exports = { authenticateToken };
