const pool = require('../config/database');
const crypto = require('crypto');

// ---- DOCUMENTS ----

const getDocuments = async (req, res) => {
    try {
        const { client_id, company_id, category, status, search, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let where = '1=1';
        const params = [];
        if (client_id) { where += ' AND d.client_id = ?'; params.push(client_id); }
        if (company_id) { where += ' AND d.company_id = ?'; params.push(company_id); }
        if (category) { where += ' AND d.category = ?'; params.push(category); }
        if (status) { where += ' AND d.status = ?'; params.push(status); }
        if (search) { where += ' AND (d.title LIKE ? OR d.file_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

        const [rows] = await pool.query(
            `SELECT d.*, u.first_name as uploaded_by_name, cl.name as client_name, co.name as company_name
             FROM documents d
             LEFT JOIN users u ON d.uploaded_by = u.id
             LEFT JOIN clients cl ON d.client_id = cl.id
             LEFT JOIN companies co ON d.company_id = co.id
             WHERE ${where} ORDER BY d.created_at DESC LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );
        const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM documents d WHERE ${where}`, params);
        res.json({ success: true, data: rows, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
    } catch (error) {
        console.error('Get documents error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch documents' });
    }
};

const createDocument = async (req, res) => {
    try {
        const { title, description, file_url, file_name, file_size, mime_type, category, client_id, company_id } = req.body;
        const [result] = await pool.query(
            `INSERT INTO documents (title, description, file_url, file_name, file_size, mime_type, category, client_id, company_id, uploaded_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, description, file_url, file_name, file_size, mime_type, category, client_id, company_id, req.user.id]
        );
        const [rows] = await pool.query('SELECT * FROM documents WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Create document error:', error);
        res.status(500).json({ success: false, message: 'Failed to create document' });
    }
};

const updateDocument = async (req, res) => {
    try {
        const { title, description, category, status } = req.body;
        await pool.query(
            'UPDATE documents SET title=?, description=?, category=?, status=? WHERE id=?',
            [title, description, category, status, req.params.id]
        );
        const [rows] = await pool.query('SELECT * FROM documents WHERE id = ?', [req.params.id]);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Update document error:', error);
        res.status(500).json({ success: false, message: 'Failed to update document' });
    }
};

const deleteDocument = async (req, res) => {
    try {
        await pool.query('DELETE FROM documents WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Document deleted' });
    } catch (error) {
        console.error('Delete document error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete document' });
    }
};

// ---- DOCUMENT REQUESTS (Magic Link) ----

const getDocumentRequests = async (req, res) => {
    try {
        const { client_id, status } = req.query;
        let where = '1=1';
        const params = [];
        if (client_id) { where += ' AND dr.client_id = ?'; params.push(client_id); }
        if (status) { where += ' AND dr.status = ?'; params.push(status); }

        const [rows] = await pool.query(
            `SELECT dr.*, cl.name as client_name, u.first_name as requested_by_name
             FROM document_requests dr
             JOIN clients cl ON dr.client_id = cl.id
             JOIN users u ON dr.requested_by = u.id
             WHERE ${where} ORDER BY dr.created_at DESC`,
            params
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get document requests error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch document requests' });
    }
};

/** GET /api/v1/documents/requested — search, page, limit */
const listRequestedDocuments = async (req, res) => {
    try {
        const { search = '', page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const where = ['1=1'];
        const params = [];
        const term = String(search).trim();
        if (term) {
            const t = `%${term}%`;
            where.push(
                '(dr.document_title LIKE ? OR cl.name LIKE ? OR cl.company_name LIKE ? OR cl.cin LIKE ?)'
            );
            params.push(t, t, t, t);
        }
        const whereSql = where.join(' AND ');
        const [rows] = await pool.query(
            `SELECT dr.id, dr.document_title, dr.status, dr.created_at, dr.due_date,
                    cl.name AS client_name, cl.company_name, cl.cin AS client_cin,
                    u.first_name AS req_first, u.last_name AS req_last,
                    doc.file_name AS uploaded_file_name
             FROM document_requests dr
             JOIN clients cl ON dr.client_id = cl.id
             JOIN users u ON dr.requested_by = u.id
             LEFT JOIN documents doc ON dr.document_id = doc.id
             WHERE ${whereSql}
             ORDER BY dr.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, parseInt(limit, 10), offset]
        );
        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM document_requests dr
             JOIN clients cl ON dr.client_id = cl.id
             WHERE ${whereSql}`,
            params
        );
        const data = rows.map((r) => ({
            id: r.id,
            requestedBy: [r.req_first, r.req_last].filter(Boolean).join(' ').trim() || null,
            requestedOn: r.created_at,
            companyName: r.company_name || r.client_name || null,
            financialYear: null,
            fileName: r.uploaded_file_name || r.document_title,
            status: r.status,
            dueDate: r.due_date
        }));
        res.json({
            success: true,
            message: ' ',
            data,
            pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total }
        });
    } catch (error) {
        console.error('listRequestedDocuments:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch requested documents', data: [] });
    }
};

const createDocumentRequest = async (req, res) => {
    try {
        const { document_title, description, client_id, due_date } = req.body;
        const magicToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const [result] = await pool.query(
            `INSERT INTO document_requests (document_title, description, client_id, requested_by, due_date, magic_link_token, magic_link_expires_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [document_title, description, client_id, req.user.id, due_date, magicToken, expiresAt]
        );
        const [rows] = await pool.query('SELECT * FROM document_requests WHERE id = ?', [result.insertId]);
        const magicLink = `${process.env.FRONTEND_URL}/upload/${magicToken}`;
        res.status(201).json({ success: true, data: { ...rows[0], magicLink } });
    } catch (error) {
        console.error('Create document request error:', error);
        res.status(500).json({ success: false, message: 'Failed to create document request' });
    }
};

const uploadViaMagicLink = async (req, res) => {
    try {
        const { token } = req.params;
        const [reqRows] = await pool.query(
            'SELECT * FROM document_requests WHERE magic_link_token = ? AND magic_link_expires_at > NOW() AND status = "pending"',
            [token]
        );
        if (reqRows.length === 0) return res.status(400).json({ success: false, message: 'Invalid or expired upload link' });

        const docReq = reqRows[0];
        const { file_url, file_name, file_size, mime_type } = req.body;
        const [docResult] = await pool.query(
            `INSERT INTO documents (title, file_url, file_name, file_size, mime_type, client_id, status) VALUES (?, ?, ?, ?, ?, ?, 'uploaded')`,
            [docReq.document_title, file_url, file_name, file_size, mime_type, docReq.client_id]
        );
        await pool.query(
            'UPDATE document_requests SET status = "uploaded", document_id = ? WHERE id = ?',
            [docResult.insertId, docReq.id]
        );
        res.json({ success: true, message: 'Document uploaded successfully' });
    } catch (error) {
        console.error('Upload via magic link error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload document' });
    }
};

module.exports = {
    getDocuments, createDocument, updateDocument, deleteDocument,
    getDocumentRequests, createDocumentRequest, uploadViaMagicLink,
    listRequestedDocuments
};
