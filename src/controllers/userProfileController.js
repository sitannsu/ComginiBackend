const bcrypt = require('bcryptjs');
const pool = require('../config/database');

const updateProfile = async (req, res) => {
    try {
        const { firstName, lastName, gender, avatar } = req.body;
        const userId = req.user.id;
        await pool.query(
            `UPDATE users SET first_name = ?, last_name = ?, gender = ?, avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [firstName ?? null, lastName ?? null, gender ?? null, avatar ?? 'blue', userId]
        );
        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('updateProfile error:', error);
        res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
};

const updateContact = async (req, res) => {
    try {
        const { email, phone } = req.body;
        const updates = [];
        const params = [];
        if (email !== undefined) {
            if (typeof email !== 'string' || !email.trim()) {
                return res.status(400).json({ success: false, message: 'Invalid email' });
            }
            const normalized = email.toLowerCase().trim();
            const [dup] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [normalized, req.user.id]);
            if (dup.length > 0) {
                return res.status(409).json({ success: false, message: 'Email is already in use' });
            }
            updates.push('email = ?');
            params.push(normalized);
        }
        if (phone !== undefined) {
            updates.push('phone = ?');
            params.push(phone);
        }
        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'email or phone required' });
        }
        params.push(req.user.id);
        await pool.query(
            `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            params
        );
        res.json({ success: true, message: 'Contact info updated' });
    } catch (error) {
        console.error('updateContact error:', error);
        res.status(500).json({ success: false, message: 'Failed to update contact' });
    }
};

const updateBusiness = async (req, res) => {
    try {
        const { companyName, gstNumber } = req.body;
        await pool.query(
            `UPDATE users SET company_name = ?, gst_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [companyName ?? null, gstNumber ?? null, req.user.id]
        );
        res.json({ success: true, message: 'Business info updated' });
    } catch (error) {
        console.error('updateBusiness error:', error);
        res.status(500).json({ success: false, message: 'Failed to update business info' });
    }
};

const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'oldPassword and newPassword are required' });
        }
        const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const ok = await bcrypt.compare(oldPassword, rows[0].password_hash);
        if (!ok) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect' });
        }
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
            passwordHash,
            req.user.id
        ]);
        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('changePassword error:', error);
        res.status(500).json({ success: false, message: 'Failed to change password' });
    }
};

module.exports = {
    updateProfile,
    updateContact,
    updateBusiness,
    changePassword
};
