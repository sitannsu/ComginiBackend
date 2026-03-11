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
        // Support both API + UI payload shapes (snake_case + camelCase)
        const {
            name,
            email,
            phone,
            company_name,
            companyName,
            cin,
            pan,
            gstin,
            address,
            city,
            state,
            pincode,
            pinCode,
            client_group,
            clientGroup,
            risk_score,
            riskScore,
        } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'name is required' });
        }

        // mysql2 does not allow `undefined` in bind parameters.
        const toNull = (v) => (v === undefined ? null : v);

        const resolvedCompanyName = company_name !== undefined ? company_name : companyName;
        const resolvedPincode = pincode !== undefined ? pincode : pinCode;
        const resolvedClientGroup = client_group !== undefined ? client_group : clientGroup;
        const resolvedRiskScore = (risk_score !== undefined ? risk_score : riskScore) || 'low';

        const [result] = await pool.query(
            `INSERT INTO clients (name, email, phone, company_name, cin, pan, gstin, address, city, state, pincode, client_group, risk_score, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name.trim(),
                toNull(email),
                toNull(phone),
                toNull(resolvedCompanyName),
                toNull(cin),
                toNull(pan),
                toNull(gstin),
                toNull(address),
                toNull(city),
                toNull(state),
                toNull(resolvedPincode),
                toNull(resolvedClientGroup),
                resolvedRiskScore,
                toNull(req.user?.id),
            ]
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
        const {
            name,
            email,
            phone,
            company_name,
            companyName,
            cin,
            pan,
            gstin,
            address,
            city,
            state,
            pincode,
            pinCode,
            client_group,
            clientGroup,
            risk_score,
            riskScore,
            status,
        } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'name is required' });
        }

        // mysql2 does not allow `undefined` in bind parameters.
        const toNull = (v) => (v === undefined ? null : v);
        const resolvedCompanyName = company_name !== undefined ? company_name : companyName;
        const resolvedPincode = pincode !== undefined ? pincode : pinCode;
        const resolvedClientGroup = client_group !== undefined ? client_group : clientGroup;
        const resolvedRiskScore = risk_score !== undefined ? risk_score : riskScore;

        await pool.query(
            `UPDATE clients SET name=?, email=?, phone=?, company_name=?, cin=?, pan=?, gstin=?, address=?, city=?, state=?, pincode=?, client_group=?, risk_score=?, status=? WHERE id=?`,
            [
                name.trim(),
                toNull(email),
                toNull(phone),
                toNull(resolvedCompanyName),
                toNull(cin),
                toNull(pan),
                toNull(gstin),
                toNull(address),
                toNull(city),
                toNull(state),
                toNull(resolvedPincode),
                toNull(resolvedClientGroup),
                toNull(resolvedRiskScore),
                toNull(status),
                req.params.id,
            ]
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
        // Support UI payload shape (client portal)
        const {
            name,
            designation,
            job_title,
            jobTitle,
            first_name,
            last_name,
            firstName,
            lastName,
            email,
            phone,
            skype,
            gender,
            is_primary,
            isPrimary,
            client_id,
            clientId,
        } = req.body;

        const resolvedClientId = req.params.clientId || client_id || clientId;
        if (!resolvedClientId) {
            return res.status(400).json({ success: false, message: 'clientId is required' });
        }

        const resolvedIsPrimary = is_primary !== undefined ? is_primary : isPrimary;

        const resolvedFirstName = first_name !== undefined ? first_name : firstName;
        const resolvedLastName = last_name !== undefined ? last_name : lastName;
        const resolvedName =
            name ||
            [resolvedFirstName, resolvedLastName].filter(Boolean).join(' ').trim();

        if (!resolvedName || resolvedName.length === 0) {
            return res.status(400).json({ success: false, message: 'name (or firstName/lastName) is required' });
        }

        // mysql2 does not allow `undefined` in bind parameters.
        const toNull = (v) => (v === undefined ? null : v);

        const resolvedJobTitle = job_title !== undefined ? job_title : jobTitle;
        const resolvedDesignation = designation || resolvedJobTitle;

        if (resolvedIsPrimary) {
            await pool.query('UPDATE client_contacts SET is_primary = false WHERE client_id = ?', [resolvedClientId]);
        }
        const [result] = await pool.query(
            // Keep compatibility with existing DB schema (extra UI fields are accepted but not stored by default).
            'INSERT INTO client_contacts (client_id, name, designation, email, phone, is_primary) VALUES (?, ?, ?, ?, ?, ?)',
            [
                resolvedClientId,
                resolvedName,
                toNull(resolvedDesignation),
                toNull(email),
                toNull(phone),
                resolvedIsPrimary || false,
            ]
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
