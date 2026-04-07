const pool = require('../config/database');

const toNull = (v) => (v === undefined ? null : v);

const LEAD_STATUSES = ['Discussion', 'Under Review', 'In Progress', 'Pending Client', 'Pending DSC'];

const KANBAN_BUCKETS = ['todo', 'under_review', 'in_progress', 'pending_client', 'pending_dsc'];
const STATUS_TO_BUCKET = {
    Discussion: 'todo',
    'Under Review': 'under_review',
    'In Progress': 'in_progress',
    'Pending Client': 'pending_client',
    'Pending DSC': 'pending_dsc'
};

const mapLeadForSpec = (row) => ({
    id: `lead_${row.id}`,
    title: row.title,
    company_name: row.company_name,
    primary_contact: row.phone,
    owner: row.owner_name || null,
    status: row.status,
    source: row.source
});

const parseLeadId = (param) => String(param).replace(/^lead_/, '');

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
        res.json({
            success: true,
            message: 'Success',
            data: {
                total,
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                leads: rows.map(mapLeadForSpec)
            }
        });
    } catch (error) {
        console.error('Get leads error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch leads' });
    }
};

const getLeadSources = async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Success',
            data: ['Online', 'Referral', 'Cold Call', 'WhatsApp', 'Email', 'Event', 'Ads']
        });
    } catch (error) {
        console.error('Get lead sources error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch sources' });
    }
};

const getLeadStatus = async (req, res) => {
    try {
        res.json({ success: true, message: 'Success', data: LEAD_STATUSES });
    } catch (error) {
        console.error('Get lead status error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch status list' });
    }
};

const createLead = async (req, res) => {
    try {
        const b = req.body;
        const companyName = b.company_name ?? b.companyName;
        const ownerId = b.owner_id ?? b.ownerId;
        const { title, status, source, address, city, state, pincode, country, phone, website, gstin } = b;
        const [result] = await pool.query(
            `INSERT INTO leads (title, company_name, status, owner_id, source, address, city, state, pincode, country, phone, website, gstin, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [toNull(title), toNull(companyName), toNull(status), toNull(ownerId), toNull(source), toNull(address), toNull(city), toNull(state), toNull(pincode), toNull(country), toNull(phone), toNull(website), toNull(gstin), req.user.id]
        );
        const [rows] = await pool.query(
            `SELECT l.*, CONCAT(u.first_name, ' ', u.last_name) as owner_name FROM leads l
             LEFT JOIN users u ON l.owner_id = u.id WHERE l.id = ?`,
            [result.insertId]
        );
        res.status(201).json({
            success: true,
            message: 'Lead created successfully',
            data: { id: `lead_${result.insertId}` }
        });
    } catch (error) {
        console.error('Create lead error:', error);
        res.status(500).json({ success: false, message: 'Failed to create lead' });
    }
};

const updateLead = async (req, res) => {
    try {
        const b = req.body;
        const companyName = b.company_name ?? b.companyName;
        const ownerId = b.owner_id ?? b.ownerId;
        const { title, status, source, address, city, state, pincode, country, phone, website, gstin } = b;
        const leadPk = parseLeadId(req.params.leadId);
        await pool.query(
            `UPDATE leads
             SET title=?, company_name=?, status=?, owner_id=?, source=?, address=?, city=?, state=?, pincode=?, country=?, phone=?, website=?, gstin=?
             WHERE id=?`,
            [toNull(title), toNull(companyName), toNull(status), toNull(ownerId), toNull(source), toNull(address), toNull(city), toNull(state), toNull(pincode), toNull(country), toNull(phone), toNull(website), toNull(gstin), leadPk]
        );
        const [rows] = await pool.query(
            `SELECT l.*, CONCAT(u.first_name, ' ', u.last_name) as owner_name FROM leads l
             LEFT JOIN users u ON l.owner_id = u.id WHERE l.id = ?`,
            [leadPk]
        );
        res.json({
            success: true,
            message: 'Lead updated successfully',
            data: rows[0] ? mapLeadForSpec(rows[0]) : null
        });
    } catch (error) {
        console.error('Update lead error:', error);
        res.status(500).json({ success: false, message: 'Failed to update lead' });
    }
};

const deleteLead = async (req, res) => {
    try {
        await pool.query('DELETE FROM leads WHERE id = ?', [parseLeadId(req.params.leadId)]);
        res.json({ success: true, message: 'Lead deleted successfully' });
    } catch (error) {
        console.error('Delete lead error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete lead' });
    }
};

const getKanban = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT l.*, CONCAT(u.first_name, ' ', u.last_name) as owner_name
             FROM leads l
             LEFT JOIN users u ON l.owner_id = u.id
             ORDER BY l.updated_at DESC`
        );
        const data = KANBAN_BUCKETS.reduce((acc, k) => {
            acc[k] = [];
            return acc;
        }, {});
        rows.forEach((row) => {
            const bucket = STATUS_TO_BUCKET[row.status] || 'todo';
            if (!data[bucket]) data[bucket] = [];
            data[bucket].push(mapLeadForSpec(row));
        });
        res.json({ success: true, message: 'Success', data });
    } catch (error) {
        console.error('Get lead kanban error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch lead kanban' });
    }
};

module.exports = {
    getLeads,
    createLead,
    updateLead,
    deleteLead,
    getKanban,
    getLeadSources,
    getLeadStatus
};
