const pool = require('../config/database');

const getUsers = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, first_name, last_name, email, role FROM users WHERE is_active = true ORDER BY first_name');
        res.json({ success: true, message: 'Success', data: rows });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
};

const getMasterStatus = async (req, res) => {
    res.json({
        success: true,
        message: 'Success',
        data: ['pending', 'in_progress', 'review', 'completed', 'cancelled', 'active', 'inactive']
    });
};

const getMasterSources = async (req, res) => {
    res.json({
        success: true,
        message: 'Success',
        data: ['Online', 'Referral', 'Cold Call', 'WhatsApp', 'Email', 'Event']
    });
};

const uploadFile = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'file is required' });
        res.status(201).json({
            success: true,
            message: 'Success',
            data: {
                file_name: req.file.originalname,
                file_url: `/uploads/common/${req.file.filename}`,
                size: req.file.size,
                mime_type: req.file.mimetype
            }
        });
    } catch (error) {
        console.error('Upload file error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload file' });
    }
};

module.exports = { getUsers, getMasterStatus, getMasterSources, uploadFile };
