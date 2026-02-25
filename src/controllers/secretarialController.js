const pool = require('../config/database');

// ---- FILING STATUS ----

const getFilingStatus = async (req, res) => {
    try {
        const { company_id, financial_year, status, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let where = '1=1';
        const params = [];
        if (company_id) { where += ' AND fs.company_id = ?'; params.push(company_id); }
        if (financial_year) { where += ' AND fs.financial_year = ?'; params.push(financial_year); }
        if (status) { where += ' AND fs.status = ?'; params.push(status); }

        const [rows] = await pool.query(
            `SELECT fs.*, co.name as company_name
             FROM filing_status fs JOIN companies co ON fs.company_id = co.id
             WHERE ${where} ORDER BY fs.due_date ASC LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );
        const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM filing_status fs WHERE ${where}`, params);
        res.json({ success: true, data: rows, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
    } catch (error) {
        console.error('Get filing status error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch filing status' });
    }
};

const createFilingStatus = async (req, res) => {
    try {
        const { company_id, financial_year, form_type, status, filing_date, due_date, srn, agm_date, receipt_date, remarks } = req.body;
        const [result] = await pool.query(
            `INSERT INTO filing_status (company_id, financial_year, form_type, status, filing_date, due_date, srn, agm_date, receipt_date, remarks)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [company_id, financial_year, form_type, status || 'pending', filing_date, due_date, srn, agm_date, receipt_date, remarks]
        );
        const [rows] = await pool.query('SELECT * FROM filing_status WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Create filing status error:', error);
        res.status(500).json({ success: false, message: 'Failed to create filing status' });
    }
};

const updateFilingStatus = async (req, res) => {
    try {
        const { financial_year, form_type, status, filing_date, due_date, srn, agm_date, receipt_date, remarks } = req.body;
        await pool.query(
            `UPDATE filing_status SET financial_year=?, form_type=?, status=?, filing_date=?, due_date=?, srn=?, agm_date=?, receipt_date=?, remarks=? WHERE id=?`,
            [financial_year, form_type, status, filing_date, due_date, srn, agm_date, receipt_date, remarks, req.params.id]
        );
        const [rows] = await pool.query('SELECT * FROM filing_status WHERE id = ?', [req.params.id]);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Update filing status error:', error);
        res.status(500).json({ success: false, message: 'Failed to update filing status' });
    }
};

const bulkUpdateFilingStatus = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const { updates } = req.body;
        for (const u of updates) {
            await conn.query('UPDATE filing_status SET status = ? WHERE id = ?', [u.status, u.id]);
        }
        res.json({ success: true, message: `${updates.length} filing statuses updated` });
    } catch (error) {
        console.error('Bulk update filing status error:', error);
        res.status(500).json({ success: false, message: 'Failed to bulk update' });
    } finally {
        conn.release();
    }
};

// ---- COMPLIANCE REMINDERS ----

const getReminders = async (req, res) => {
    try {
        const { company_id, status } = req.query;
        let where = '1=1';
        const params = [];
        if (company_id) { where += ' AND cr.company_id = ?'; params.push(company_id); }
        if (status) { where += ' AND cr.status = ?'; params.push(status); }

        const [rows] = await pool.query(
            `SELECT cr.*, co.name as company_name, u.first_name as created_by_name
             FROM compliance_reminders cr
             JOIN companies co ON cr.company_id = co.id
             LEFT JOIN users u ON cr.created_by = u.id
             WHERE ${where} ORDER BY cr.reminder_date ASC`,
            params
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get reminders error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch reminders' });
    }
};

const createReminder = async (req, res) => {
    try {
        const { company_id, compliance_type, due_date, reminder_date, email_recipients, email_subject, email_body, send_whatsapp } = req.body;
        const [result] = await pool.query(
            `INSERT INTO compliance_reminders (company_id, compliance_type, due_date, reminder_date, email_recipients, email_subject, email_body, send_whatsapp, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [company_id, compliance_type, due_date, reminder_date, email_recipients, email_subject, email_body, send_whatsapp || false, req.user.id]
        );
        const [rows] = await pool.query('SELECT * FROM compliance_reminders WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Create reminder error:', error);
        res.status(500).json({ success: false, message: 'Failed to create reminder' });
    }
};

const deleteReminder = async (req, res) => {
    try {
        await pool.query('UPDATE compliance_reminders SET status = "cancelled" WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Reminder cancelled' });
    } catch (error) {
        console.error('Delete reminder error:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel reminder' });
    }
};

// ---- DSC MANAGEMENT ----

const getDSCTokens = async (req, res) => {
    try {
        const { company_id, client_group, current_status, search } = req.query;
        let where = '1=1';
        const params = [];
        if (company_id) { where += ' AND dt.company_id = ?'; params.push(company_id); }
        if (client_group) { where += ' AND dt.client_group = ?'; params.push(client_group); }
        if (current_status) { where += ' AND dt.current_status = ?'; params.push(current_status); }
        if (search) { where += ' AND (dt.holder_name LIKE ? OR dt.din LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

        const [rows] = await pool.query(
            `SELECT dt.*, co.name as company_name,
                    DATEDIFF(dt.expiry_date, CURDATE()) as days_to_expiry
             FROM dsc_tokens dt LEFT JOIN companies co ON dt.company_id = co.id
             WHERE ${where} ORDER BY dt.expiry_date ASC`,
            params
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get DSC tokens error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch DSC tokens' });
    }
};

const createDSCToken = async (req, res) => {
    try {
        const { holder_name, din, company_id, client_group, token_serial, provider, issue_date, expiry_date, box_location, notes } = req.body;
        const [result] = await pool.query(
            `INSERT INTO dsc_tokens (holder_name, din, company_id, client_group, token_serial, provider, issue_date, expiry_date, box_location, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [holder_name, din, company_id, client_group, token_serial, provider, issue_date, expiry_date, box_location, notes]
        );
        const [rows] = await pool.query('SELECT * FROM dsc_tokens WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Create DSC token error:', error);
        res.status(500).json({ success: false, message: 'Failed to create DSC token' });
    }
};

const updateDSCToken = async (req, res) => {
    try {
        const { holder_name, din, company_id, client_group, token_serial, provider, issue_date, expiry_date, box_location, notes } = req.body;
        await pool.query(
            `UPDATE dsc_tokens SET holder_name=?, din=?, company_id=?, client_group=?, token_serial=?, provider=?, issue_date=?, expiry_date=?, box_location=?, notes=? WHERE id=?`,
            [holder_name, din, company_id, client_group, token_serial, provider, issue_date, expiry_date, box_location, notes, req.params.id]
        );
        const [rows] = await pool.query('SELECT * FROM dsc_tokens WHERE id = ?', [req.params.id]);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Update DSC token error:', error);
        res.status(500).json({ success: false, message: 'Failed to update DSC token' });
    }
};

const toggleDSCStatus = async (req, res) => {
    try {
        const { current_status, checked_out_to } = req.body;
        await pool.query(
            'UPDATE dsc_tokens SET current_status = ?, checked_out_to = ?, last_status_change = NOW() WHERE id = ?',
            [current_status, checked_out_to || null, req.params.id]
        );
        const [rows] = await pool.query('SELECT * FROM dsc_tokens WHERE id = ?', [req.params.id]);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Toggle DSC status error:', error);
        res.status(500).json({ success: false, message: 'Failed to toggle DSC status' });
    }
};

// ---- DSC BOXES ----

const getDSCBoxes = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM dsc_boxes ORDER BY name');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get DSC boxes error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch DSC boxes' });
    }
};

const createDSCBox = async (req, res) => {
    try {
        const { name, location, capacity } = req.body;
        const [result] = await pool.query('INSERT INTO dsc_boxes (name, location, capacity) VALUES (?, ?, ?)', [name, location, capacity || 50]);
        const [rows] = await pool.query('SELECT * FROM dsc_boxes WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Create DSC box error:', error);
        res.status(500).json({ success: false, message: 'Failed to create DSC box' });
    }
};

// ---- DIRECTOR TENURE TRACKER ----

const getDirectorTenures = async (req, res) => {
    try {
        const { company_id } = req.query;
        let where = 'd.is_active = true';
        const params = [];
        if (company_id) { where += ' AND d.company_id = ?'; params.push(company_id); }

        const [rows] = await pool.query(
            `SELECT d.*, co.name as company_name,
                    TIMESTAMPDIFF(YEAR, d.appointment_date, COALESCE(d.cessation_date, CURDATE())) as calculated_tenure_years,
                    DATEDIFF(DATE_ADD(d.appointment_date, INTERVAL COALESCE(d.tenure_years, 5) YEAR), CURDATE()) as days_remaining
             FROM directors d JOIN companies co ON d.company_id = co.id
             WHERE ${where} ORDER BY days_remaining ASC`,
            params
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get director tenures error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch director tenures' });
    }
};

module.exports = {
    getFilingStatus, createFilingStatus, updateFilingStatus, bulkUpdateFilingStatus,
    getReminders, createReminder, deleteReminder,
    getDSCTokens, createDSCToken, updateDSCToken, toggleDSCStatus,
    getDSCBoxes, createDSCBox,
    getDirectorTenures
};
