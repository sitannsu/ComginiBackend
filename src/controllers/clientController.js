const pool = require('../config/database');

// ---- CLIENTS ----

const getClients = async (req, res) => {
    try {
        const { status, group, search, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let where = '1=1';
        const params = [];

        if (status) { where += ' AND c.status = ?'; params.push(status); }
        if (group) { where += ' AND c.client_group = ?'; params.push(group); }
        if (search) { where += ' AND (c.name LIKE ? OR c.email LIKE ? OR c.company_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

        const [rows] = await pool.query(
            `SELECT c.*, u.first_name as created_by_name FROM clients c LEFT JOIN users u ON c.created_by = u.id WHERE ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );
        const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM clients c WHERE ${where}`, params);
        res.json({ success: true, data: rows, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
    } catch (error) {
        console.error('Get clients error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch clients' });
    }
};

const getClientById = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM clients WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Client not found' });
        const [contacts] = await pool.query('SELECT * FROM client_contacts WHERE client_id = ?', [req.params.id]);
        res.json({ success: true, data: { ...rows[0], contacts } });
    } catch (error) {
        console.error('Get client error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch client' });
    }
};

const createClient = async (req, res) => {
    try {
        const { name, email, phone, company_name, cin, pan, gstin, address, city, state, pincode, client_group, risk_score } = req.body;
        const [result] = await pool.query(
            `INSERT INTO clients (name, email, phone, company_name, cin, pan, gstin, address, city, state, pincode, client_group, risk_score, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, email, phone, company_name, cin, pan, gstin, address, city, state, pincode, client_group, risk_score || 'low', req.user.id]
        );
        const [rows] = await pool.query('SELECT * FROM clients WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Create client error:', error);
        res.status(500).json({ success: false, message: 'Failed to create client' });
    }
};

const updateClient = async (req, res) => {
    try {
        const { name, email, phone, company_name, cin, pan, gstin, address, city, state, pincode, client_group, risk_score, status } = req.body;
        await pool.query(
            `UPDATE clients SET name=?, email=?, phone=?, company_name=?, cin=?, pan=?, gstin=?, address=?, city=?, state=?, pincode=?, client_group=?, risk_score=?, status=? WHERE id=?`,
            [name, email, phone, company_name, cin, pan, gstin, address, city, state, pincode, client_group, risk_score, status, req.params.id]
        );
        const [rows] = await pool.query('SELECT * FROM clients WHERE id = ?', [req.params.id]);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Update client error:', error);
        res.status(500).json({ success: false, message: 'Failed to update client' });
    }
};

const deleteClient = async (req, res) => {
    try {
        await pool.query('DELETE FROM clients WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Client deleted' });
    } catch (error) {
        console.error('Delete client error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete client' });
    }
};

// ---- CLIENT CONTACTS ----

const addContact = async (req, res) => {
    try {
        const { name, designation, email, phone, is_primary } = req.body;
        if (is_primary) {
            await pool.query('UPDATE client_contacts SET is_primary = false WHERE client_id = ?', [req.params.clientId]);
        }
        const [result] = await pool.query(
            'INSERT INTO client_contacts (client_id, name, designation, email, phone, is_primary) VALUES (?, ?, ?, ?, ?, ?)',
            [req.params.clientId, name, designation, email, phone, is_primary || false]
        );
        const [rows] = await pool.query('SELECT * FROM client_contacts WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Add contact error:', error);
        res.status(500).json({ success: false, message: 'Failed to add contact' });
    }
};

const deleteContact = async (req, res) => {
    try {
        await pool.query('DELETE FROM client_contacts WHERE id = ?', [req.params.contactId]);
        res.json({ success: true, message: 'Contact deleted' });
    } catch (error) {
        console.error('Delete contact error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete contact' });
    }
};

module.exports = { getClients, getClientById, createClient, updateClient, deleteClient, addContact, deleteContact };
