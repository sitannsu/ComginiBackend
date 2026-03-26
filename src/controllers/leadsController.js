const pool = require('../config/database');

const toNull = (v) => (v === undefined ? null : v);

const getLeads = async (req, res) => {
    try {
        const { owner, source, status, search, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        let where = '1=1';
        const params = [];
        if (owner) { where += ' AND l.owner_id = ?'; params.push(owner); }
        if (source) { where += ' AND l.source = ?'; params.push(source); }
        if (status) { where += ' AND l.status = ?'; params.push(status); }
        if (search) {
            where += ' AND (l.title LIKE ? OR l.company_name LIKE ? OR l.city LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        const [rows] = await pool.query(
            `SELECT l.*, CONCAT(u.first_name, ' ', u.last_name) as owner_name
             FROM leads l
             LEFT JOIN users u ON l.owner_id = u.id
             WHERE ${where}
             ORDER BY l.updated_at DESC
             LIMIT ? OFFSET ?`,
            [...params, parseInt(limit, 10), offset]
        );
        const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM leads l WHERE ${where}`, params);
        res.json({ success: true, message: 'Success', data: rows, pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total } });
    } catch (error) {
        console.error('Get leads error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch leads' });
    }
};

const createLead = async (req, res) => {
    try {
        const { title, companyName, status, ownerId, source, address, city, state, pincode, country, phone, website, gstin } = req.body;
        const [result] = await pool.query(
            `INSERT INTO leads (title, company_name, status, owner_id, source, address, city, state, pincode, country, phone, website, gstin, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [toNull(title), toNull(companyName), toNull(status), toNull(ownerId), toNull(source), toNull(address), toNull(city), toNull(state), toNull(pincode), toNull(country), toNull(phone), toNull(website), toNull(gstin), req.user.id]
        );
        const [rows] = await pool.query('SELECT * FROM leads WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, message: 'Success', data: rows[0] });
    } catch (error) {
        console.error('Create lead error:', error);
        res.status(500).json({ success: false, message: 'Failed to create lead' });
    }
};

const updateLead = async (req, res) => {
    try {
        const { title, companyName, status, ownerId, source, address, city, state, pincode, country, phone, website, gstin } = req.body;
        await pool.query(
            `UPDATE leads
             SET title=?, company_name=?, status=?, owner_id=?, source=?, address=?, city=?, state=?, pincode=?, country=?, phone=?, website=?, gstin=?
             WHERE id=?`,
            [toNull(title), toNull(companyName), toNull(status), toNull(ownerId), toNull(source), toNull(address), toNull(city), toNull(state), toNull(pincode), toNull(country), toNull(phone), toNull(website), toNull(gstin), req.params.leadId]
        );
        const [rows] = await pool.query('SELECT * FROM leads WHERE id = ?', [req.params.leadId]);
        res.json({ success: true, message: 'Success', data: rows[0] || null });
    } catch (error) {
        console.error('Update lead error:', error);
        res.status(500).json({ success: false, message: 'Failed to update lead' });
    }
};

const deleteLead = async (req, res) => {
    try {
        await pool.query('DELETE FROM leads WHERE id = ?', [req.params.leadId]);
        res.json({ success: true, message: 'Success', data: [] });
    } catch (error) {
        console.error('Delete lead error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete lead' });
    }
};

const getKanban = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM leads ORDER BY updated_at DESC');
        const grouped = rows.reduce((acc, lead) => {
            const key = lead.status || 'Uncategorized';
            if (!acc[key]) acc[key] = [];
            acc[key].push(lead);
            return acc;
        }, {});
        res.json({ success: true, message: 'Success', data: grouped });
    } catch (error) {
        console.error('Get lead kanban error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch lead kanban' });
    }
};

module.exports = { getLeads, createLead, updateLead, deleteLead, getKanban };
