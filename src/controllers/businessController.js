const pool = require('../config/database');

const getRegistrations = async (req, res) => {
    try {
        const { company_id, status, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let where = '1=1';
        const params = [];
        if (company_id) { where += ' AND rl.company_id = ?'; params.push(company_id); }
        if (status) { where += ' AND rl.status = ?'; params.push(status); }

        const [rows] = await pool.query(
            `SELECT rl.*, co.name as company_name
             FROM registrations_licenses rl LEFT JOIN companies co ON rl.company_id = co.id
             WHERE ${where} ORDER BY rl.expiry_date ASC LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );
        const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM registrations_licenses rl WHERE ${where}`, params);
        res.json({ success: true, data: rows, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
    } catch (error) {
        console.error('Get registrations error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch registrations' });
    }
};

const createRegistration = async (req, res) => {
    try {
        const { company_id, document_type, document_number, issuing_authority, issue_date, expiry_date, file_url, alert_days_before } = req.body;
        const [result] = await pool.query(
            `INSERT INTO registrations_licenses (company_id, document_type, document_number, issuing_authority, issue_date, expiry_date, file_url, alert_days_before)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [company_id, document_type, document_number, issuing_authority, issue_date, expiry_date, file_url, alert_days_before || 30]
        );
        const [rows] = await pool.query('SELECT * FROM registrations_licenses WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Create registration error:', error);
        res.status(500).json({ success: false, message: 'Failed to create registration' });
    }
};

const updateRegistration = async (req, res) => {
    try {
        const { company_id, document_type, document_number, issuing_authority, issue_date, expiry_date, status, file_url, alert_days_before } = req.body;
        await pool.query(
            `UPDATE registrations_licenses SET company_id=?, document_type=?, document_number=?, issuing_authority=?, issue_date=?, expiry_date=?, status=?, file_url=?, alert_days_before=? WHERE id=?`,
            [company_id, document_type, document_number, issuing_authority, issue_date, expiry_date, status, file_url, alert_days_before, req.params.id]
        );
        const [rows] = await pool.query('SELECT * FROM registrations_licenses WHERE id = ?', [req.params.id]);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Update registration error:', error);
        res.status(500).json({ success: false, message: 'Failed to update registration' });
    }
};

const deleteRegistration = async (req, res) => {
    try {
        await pool.query('DELETE FROM registrations_licenses WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Registration deleted' });
    } catch (error) {
        console.error('Delete registration error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete registration' });
    }
};

const getExpiringItems = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const [rows] = await pool.query(
            `SELECT rl.*, co.name as company_name,
                    DATEDIFF(rl.expiry_date, CURDATE()) as days_remaining
             FROM registrations_licenses rl
             LEFT JOIN companies co ON rl.company_id = co.id
             WHERE rl.expiry_date IS NOT NULL AND rl.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY) AND rl.status != 'expired'
             ORDER BY rl.expiry_date ASC`,
            [parseInt(days)]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get expiring items error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch expiring items' });
    }
};

module.exports = { getRegistrations, createRegistration, updateRegistration, deleteRegistration, getExpiringItems };
