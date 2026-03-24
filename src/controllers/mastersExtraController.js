const pool = require('../config/database');

const toNull = (v) => (v === undefined ? null : v);

// ---- AUDITORS ----
const createAuditor = async (req, res) => {
    try {
        const {
            company_id, category, firm_registration_number, firm_name, pan, firm_email, address,
            country, state, city, membership_number, auditor_name, mobile, email, designation
        } = req.body;

        if (!category) return res.status(400).json({ success: false, message: 'category is required' });

        const [result] = await pool.query(
            `INSERT INTO auditors
            (company_id, category, firm_registration_number, firm_name, pan, firm_email, address, country, state, city, membership_number, auditor_name, mobile, email, designation, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                toNull(company_id), category, toNull(firm_registration_number), toNull(firm_name), toNull(pan), toNull(firm_email),
                toNull(address), toNull(country), toNull(state), toNull(city), toNull(membership_number), toNull(auditor_name),
                toNull(mobile), toNull(email), toNull(designation), req.user.id
            ]
        );
        const [rows] = await pool.query('SELECT * FROM auditors WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Create auditor error:', error);
        res.status(500).json({ success: false, message: 'Failed to create auditor' });
    }
};

const getAuditors = async (req, res) => {
    try {
        const { category, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        let where = '1=1';
        const params = [];
        if (category) {
            where += ' AND a.category = ?';
            params.push(category);
        }
        const [rows] = await pool.query(
            `SELECT a.*, c.name as company_name
             FROM auditors a
             LEFT JOIN companies c ON a.company_id = c.id
             WHERE ${where}
             ORDER BY a.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, parseInt(limit, 10), offset]
        );
        const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM auditors a WHERE ${where}`, params);
        res.json({ success: true, data: rows, pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total } });
    } catch (error) {
        console.error('Get auditors error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch auditors' });
    }
};

const getCompanyWiseAuditors = async (req, res) => {
    try {
        const { company_id, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        let where = '1=1';
        const params = [];
        if (company_id) {
            where += ' AND a.company_id = ?';
            params.push(company_id);
        }
        const [rows] = await pool.query(
            `SELECT
                c.name as company_name,
                a.category,
                a.auditor_name,
                a.firm_registration_number as FRN,
                a.membership_number as membership_no,
                a.pan,
                a.email
             FROM auditors a
             LEFT JOIN companies c ON a.company_id = c.id
             WHERE ${where}
             ORDER BY a.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, parseInt(limit, 10), offset]
        );
        const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM auditors a WHERE ${where}`, params);
        res.json({ success: true, data: rows, pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total } });
    } catch (error) {
        console.error('Get company wise auditors error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch company wise auditors' });
    }
};

const uploadAuditorAdt1 = async (req, res) => {
    try {
        const auditor_id = req.body.auditor_id || null;
        const fileV2 = req.files?.file_v2?.[0] || null;
        const fileV3 = req.files?.file_v3?.[0] || null;

        const [result] = await pool.query(
            `INSERT INTO auditor_adt1_uploads (auditor_id, file_v2_name, file_v2_url, file_v3_name, file_v3_url, uploaded_by)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                toNull(auditor_id),
                fileV2 ? fileV2.originalname : null,
                fileV2 ? `/uploads/adt1/${fileV2.filename}` : null,
                fileV3 ? fileV3.originalname : null,
                fileV3 ? `/uploads/adt1/${fileV3.filename}` : null,
                req.user.id
            ]
        );
        const [rows] = await pool.query('SELECT * FROM auditor_adt1_uploads WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Upload ADT1 error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload ADT-1 files' });
    }
};

// ---- CLIENT GROUPS ----
const createClientGroup = async (req, res) => {
    try {
        const { title, contact_name, contact_no, email } = req.body;
        if (!title || !String(title).trim()) return res.status(400).json({ success: false, message: 'title is required' });
        const [result] = await pool.query(
            `INSERT INTO client_groups (title, contact_name, contact_no, email, created_by)
             VALUES (?, ?, ?, ?, ?)`,
            [String(title).trim(), toNull(contact_name), toNull(contact_no), toNull(email), req.user.id]
        );
        const [rows] = await pool.query('SELECT * FROM client_groups WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Create client group error:', error);
        res.status(500).json({ success: false, message: 'Failed to create client group' });
    }
};

const getClientGroups = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const [rows] = await pool.query(
            `SELECT id, title, contact_name, contact_no, email, created_at
             FROM client_groups
             ORDER BY created_at DESC
             LIMIT ? OFFSET ?`,
            [parseInt(limit, 10), offset]
        );
        const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM client_groups');
        res.json({ success: true, data: rows, pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total } });
    } catch (error) {
        console.error('Get client groups error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch client groups' });
    }
};

// ---- MIS ----
const generateMisReport = async (req, res) => {
    try {
        const { company_id, date, type } = req.body;
        if (!company_id) return res.status(400).json({ success: false, message: 'company_id is required' });
        const reportType = type || 'company';
        const misDate = date || new Date().toISOString().slice(0, 10);
        const exportLink = `/exports/mis/company-${company_id}-${Date.now()}.xlsx`;

        const [result] = await pool.query(
            `INSERT INTO mis_report_history (company_id, mis_date, type, generated_by, origin, export_link)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [company_id, misDate, reportType, req.user.id, 'manual', exportLink]
        );
        const [rows] = await pool.query(
            `SELECT mrh.*, c.name as generated_for, CONCAT(u.first_name, ' ', u.last_name) as generated_by_name
             FROM mis_report_history mrh
             LEFT JOIN companies c ON mrh.company_id = c.id
             LEFT JOIN users u ON mrh.generated_by = u.id
             WHERE mrh.id = ?`,
            [result.insertId]
        );
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Generate MIS report error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate MIS report' });
    }
};

const getMisReportHistory = async (req, res) => {
    try {
        const { company_id, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        let where = '1=1';
        const params = [];
        if (company_id) {
            where += ' AND mrh.company_id = ?';
            params.push(company_id);
        }
        const [rows] = await pool.query(
            `SELECT
                mrh.generated_on,
                CONCAT(u.first_name, ' ', u.last_name) as generated_by,
                c.name as generated_for,
                mrh.mis_date,
                mrh.origin,
                mrh.export_link
             FROM mis_report_history mrh
             LEFT JOIN users u ON mrh.generated_by = u.id
             LEFT JOIN companies c ON mrh.company_id = c.id
             WHERE ${where}
             ORDER BY mrh.generated_on DESC
             LIMIT ? OFFSET ?`,
            [...params, parseInt(limit, 10), offset]
        );
        const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM mis_report_history mrh WHERE ${where}`, params);
        res.json({ success: true, data: rows, pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total } });
    } catch (error) {
        console.error('Get MIS report history error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch MIS report history' });
    }
};

module.exports = {
    createAuditor, getAuditors, getCompanyWiseAuditors, uploadAuditorAdt1,
    createClientGroup, getClientGroups,
    generateMisReport, getMisReportHistory
};
