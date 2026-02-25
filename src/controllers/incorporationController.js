const pool = require('../config/database');

const getIncorporations = async (req, res) => {
    try {
        const { form_type, status, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let where = '1=1';
        const params = [];
        if (form_type) { where += ' AND i.form_type = ?'; params.push(form_type); }
        if (status) { where += ' AND i.submission_status = ?'; params.push(status); }

        const [rows] = await pool.query(
            `SELECT i.*, u.first_name as created_by_name
             FROM incorporations i LEFT JOIN users u ON i.created_by = u.id
             WHERE ${where} ORDER BY i.created_at DESC LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );
        const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM incorporations i WHERE ${where}`, params);
        res.json({ success: true, data: rows, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
    } catch (error) {
        console.error('Get incorporations error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch incorporations' });
    }
};

const getIncorporationById = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT i.*, u.first_name as created_by_name FROM incorporations i LEFT JOIN users u ON i.created_by = u.id WHERE i.id = ?',
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Incorporation not found' });
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Get incorporation error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch incorporation' });
    }
};

const createIncorporation = async (req, res) => {
    try {
        const { form_type, proposed_name_1, proposed_name_2, srn, mca_user, submission_status, approval_date, expiry_date, fee_paid, remarks } = req.body;
        const [result] = await pool.query(
            `INSERT INTO incorporations (form_type, proposed_name_1, proposed_name_2, srn, mca_user, submission_status, approval_date, expiry_date, fee_paid, remarks, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [form_type, proposed_name_1, proposed_name_2, srn, mca_user, submission_status || 'draft', approval_date, expiry_date, fee_paid, remarks, req.user.id]
        );
        const [rows] = await pool.query('SELECT * FROM incorporations WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Create incorporation error:', error);
        res.status(500).json({ success: false, message: 'Failed to create incorporation' });
    }
};

const updateIncorporation = async (req, res) => {
    try {
        const { form_type, proposed_name_1, proposed_name_2, srn, mca_user, submission_status, approval_date, expiry_date, fee_paid, remarks } = req.body;
        await pool.query(
            `UPDATE incorporations SET form_type=?, proposed_name_1=?, proposed_name_2=?, srn=?, mca_user=?, submission_status=?, approval_date=?, expiry_date=?, fee_paid=?, remarks=? WHERE id=?`,
            [form_type, proposed_name_1, proposed_name_2, srn, mca_user, submission_status, approval_date, expiry_date, fee_paid, remarks, req.params.id]
        );
        const [rows] = await pool.query('SELECT * FROM incorporations WHERE id = ?', [req.params.id]);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Update incorporation error:', error);
        res.status(500).json({ success: false, message: 'Failed to update incorporation' });
    }
};

const deleteIncorporation = async (req, res) => {
    try {
        await pool.query('DELETE FROM incorporations WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Incorporation deleted' });
    } catch (error) {
        console.error('Delete incorporation error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete incorporation' });
    }
};

module.exports = { getIncorporations, getIncorporationById, createIncorporation, updateIncorporation, deleteIncorporation };
