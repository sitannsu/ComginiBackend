const pool = require('../config/database');

const getTickets = async (req, res) => {
    try {
        const { status, category, priority, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let where = '1=1';
        const params = [];
        if (status) { where += ' AND st.status = ?'; params.push(status); }
        if (category) { where += ' AND st.category = ?'; params.push(category); }
        if (priority) { where += ' AND st.priority = ?'; params.push(priority); }

        const [rows] = await pool.query(
            `SELECT st.*, u.first_name, u.last_name, u.email
             FROM support_tickets st JOIN users u ON st.user_id = u.id
             WHERE ${where} ORDER BY FIELD(st.priority,'high','medium','low'), st.created_at DESC LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );
        const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM support_tickets st WHERE ${where}`, params);
        res.json({ success: true, data: rows, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
    } catch (error) {
        console.error('Get tickets error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
    }
};

const getTicketById = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT st.*, u.first_name, u.last_name, u.email FROM support_tickets st JOIN users u ON st.user_id = u.id WHERE st.id = ?',
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Ticket not found' });
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Get ticket error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch ticket' });
    }
};

const createTicket = async (req, res) => {
    try {
        const { subject, description, category, priority, screenshot_url } = req.body;
        const [result] = await pool.query(
            'INSERT INTO support_tickets (user_id, subject, description, category, priority, screenshot_url) VALUES (?, ?, ?, ?, ?, ?)',
            [req.user.id, subject, description, category || 'question', priority || 'medium', screenshot_url]
        );
        const [rows] = await pool.query('SELECT * FROM support_tickets WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Create ticket error:', error);
        res.status(500).json({ success: false, message: 'Failed to create ticket' });
    }
};

const updateTicket = async (req, res) => {
    try {
        const { status, resolution_notes } = req.body;
        const resolvedAt = (status === 'resolved' || status === 'closed') ? new Date() : null;
        await pool.query(
            'UPDATE support_tickets SET status=?, resolution_notes=?, resolved_at=? WHERE id=?',
            [status, resolution_notes, resolvedAt, req.params.id]
        );
        const [rows] = await pool.query('SELECT * FROM support_tickets WHERE id = ?', [req.params.id]);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Update ticket error:', error);
        res.status(500).json({ success: false, message: 'Failed to update ticket' });
    }
};

module.exports = { getTickets, getTicketById, createTicket, updateTicket };
