const pool = require('../config/database');

/**
 * Log authentication events to audit log
 */
async function logAuthEvent(userId, action, req, success = true, errorMessage = null) {
    try {
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('user-agent');

        await pool.query(
            `INSERT INTO auth_audit_log (user_id, action, ip_address, user_agent, success, error_message)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, action, ipAddress, userAgent, success, errorMessage]
        );
    } catch (error) {
        console.error('Failed to log auth event:', error);
    }
}

module.exports = { logAuthEvent };
