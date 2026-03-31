const pool = require('../config/database');

// ---- SEARCH REPORTS ----

const listSearchReports = async (req, res) => {
    try {
        const { type = 'company', page = 1, limit = 20, search = '' } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        let where = 'entity_type = ?';
        const params = [type];
        if (search) {
            where += ' AND JSON_UNQUOTE(JSON_EXTRACT(payload, "$.company_name")) LIKE ?';
            params.push(`%${search}%`);
        }
        const [rows] = await pool.query(
            `SELECT id, entity_type, payload, created_at FROM secretarial_search_reports WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
            [...params, parseInt(limit, 10), offset]
        );
        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) as total FROM secretarial_search_reports WHERE ${where}`,
            params
        );
        res.json({
            success: true,
            data: rows,
            pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total }
        });
    } catch (error) {
        console.error('listSearchReports:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({ success: false, message: 'Database table missing. Run secretarial_module_tables.sql' });
        }
        res.status(500).json({ success: false, message: 'Failed to list search reports' });
    }
};

const createSearchReport = async (req, res) => {
    try {
        const body = req.body;
        const entityType = body.entity_type === 'llp' ? 'llp' : 'company';
        const [result] = await pool.query(
            'INSERT INTO secretarial_search_reports (entity_type, payload) VALUES (?, ?)',
            [entityType, JSON.stringify(body)]
        );
        const [rows] = await pool.query('SELECT * FROM secretarial_search_reports WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('createSearchReport:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({ success: false, message: 'Database table missing. Run secretarial_module_tables.sql' });
        }
        res.status(500).json({ success: false, message: 'Failed to create search report' });
    }
};

// ---- CSR ----

const listCSRCalculations = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const [rows] = await pool.query(
            `SELECT c.*, cl.name as client_name FROM secretarial_csr_calculations c
             LEFT JOIN clients cl ON c.client_id = cl.id
             ORDER BY c.id DESC LIMIT ? OFFSET ?`,
            [parseInt(limit, 10), offset]
        );
        const parsed = rows.map((r) => {
            let cd = r.computation_data;
            if (cd && typeof cd === 'string') {
                try { cd = JSON.parse(cd); } catch (_) { /* keep */ }
            }
            return { ...r, computation_data: cd };
        });
        const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM secretarial_csr_calculations');
        res.json({
            success: true,
            data: parsed,
            pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total }
        });
    } catch (error) {
        console.error('listCSRCalculations:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({ success: false, message: 'Database table missing. Run secretarial_module_tables.sql' });
        }
        res.status(500).json({ success: false, message: 'Failed to list CSR calculations' });
    }
};

const createCSRCalculation = async (req, res) => {
    try {
        const { client_id, financial_year, computation_data, csr_spent, excess_carry_forward } = req.body;
        const [result] = await pool.query(
            `INSERT INTO secretarial_csr_calculations (client_id, financial_year, computation_data, csr_spent, excess_carry_forward)
             VALUES (?, ?, ?, ?, ?)`,
            [client_id, financial_year, JSON.stringify(computation_data || {}), csr_spent ?? 0, excess_carry_forward ?? 0]
        );
        const [rows] = await pool.query('SELECT * FROM secretarial_csr_calculations WHERE id = ?', [result.insertId]);
        const row = rows[0];
        if (row.computation_data && typeof row.computation_data === 'string') {
            try { row.computation_data = JSON.parse(row.computation_data); } catch (_) { /* keep */ }
        }
        res.status(201).json({ success: true, data: row });
    } catch (error) {
        console.error('createCSRCalculation:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({ success: false, message: 'Database table missing. Run secretarial_module_tables.sql' });
        }
        res.status(500).json({ success: false, message: 'Failed to save CSR calculation' });
    }
};

// ---- DSC (spec) ----

const createDSCBoxSpec = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'name is required' });
        const [result] = await pool.query(
            'INSERT INTO dsc_boxes (name, location, capacity) VALUES (?, NULL, 50)',
            [name]
        );
        const [rows] = await pool.query('SELECT * FROM dsc_boxes WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('createDSCBoxSpec:', error);
        res.status(500).json({ success: false, message: 'Failed to create DSC box' });
    }
};

const listDSCRecordsSpec = async (req, res) => {
    try {
        const { status, company_id, group_id, search, current_status } = req.query;
        let where = '1=1';
        const params = [];
        if (company_id) { where += ' AND dt.company_id = ?'; params.push(company_id); }
        if (group_id) { where += ' AND dt.client_group = ?'; params.push(group_id); }
        if (current_status) { where += ' AND dt.current_status = ?'; params.push(current_status); }
        if (search) {
            where += ' AND (dt.holder_name LIKE ? OR dt.din LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        if (status === 'active') {
            where += ' AND dt.expiry_date > DATE_ADD(CURDATE(), INTERVAL 30 DAY)';
        } else if (status === 'expiring') {
            where += ' AND dt.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)';
        } else if (status === 'expired') {
            where += ' AND dt.expiry_date < CURDATE()';
        }

        const [rows] = await pool.query(
            `SELECT dt.*, co.name as company_name,
                    DATEDIFF(dt.expiry_date, CURDATE()) as days_to_expiry
             FROM dsc_tokens dt LEFT JOIN companies co ON dt.company_id = co.id
             WHERE ${where} ORDER BY dt.expiry_date ASC`,
            params
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('listDSCRecordsSpec:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch DSC records' });
    }
};

const patchDSCStatusSpec = async (req, res) => {
    try {
        const { availability, location } = req.body;
        const mapped = (availability && String(availability).toLowerCase().includes('out')) ? 'out' : 'in';
        await pool.query(
            'UPDATE dsc_tokens SET current_status = ?, box_location = ?, last_status_change = NOW() WHERE id = ?',
            [mapped, location || null, req.params.id]
        );
        const [rows] = await pool.query('SELECT * FROM dsc_tokens WHERE id = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'DSC record not found' });
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('patchDSCStatusSpec:', error);
        res.status(500).json({ success: false, message: 'Failed to update DSC status' });
    }
};

// ---- DIR3 KYC ----

const submitDIR3KYC = async (req, res) => {
    try {
        const { din, pan, is_kyc_done, status, remarks } = req.body;
        const [result] = await pool.query(
            `INSERT INTO secretarial_dir3_kyc (din, pan, is_kyc_done, status, remarks) VALUES (?, ?, ?, ?, ?)`,
            [din, pan, !!is_kyc_done, status || '', remarks || '']
        );
        const [rows] = await pool.query('SELECT * FROM secretarial_dir3_kyc WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('submitDIR3KYC:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({ success: false, message: 'Database table missing. Run secretarial_module_tables.sql' });
        }
        res.status(500).json({ success: false, message: 'Failed to submit DIR3 KYC' });
    }
};

// ---- MCA CREDENTIALS ----

const upsertMCACredentials = async (req, res) => {
    try {
        const { target_id, target_type, user_id, password, v3_user_id, v3_password, last_updated } = req.body;
        const [existing] = await pool.query(
            'SELECT id FROM secretarial_mca_credentials WHERE target_id = ? AND target_type = ?',
            [target_id, target_type]
        );
        if (existing.length) {
            await pool.query(
                `UPDATE secretarial_mca_credentials SET user_id=?, password=?, v3_user_id=?, v3_password=?, last_updated=? WHERE id=?`,
                [user_id, password, v3_user_id, v3_password, last_updated, existing[0].id]
            );
            const [rows] = await pool.query('SELECT * FROM secretarial_mca_credentials WHERE id = ?', [existing[0].id]);
            return res.json({ success: true, data: rows[0] });
        }
        const [result] = await pool.query(
            `INSERT INTO secretarial_mca_credentials (target_id, target_type, user_id, password, v3_user_id, v3_password, last_updated)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [target_id, target_type, user_id, password, v3_user_id, v3_password, last_updated]
        );
        const [rows] = await pool.query('SELECT * FROM secretarial_mca_credentials WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('upsertMCACredentials:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({ success: false, message: 'Database table missing. Run secretarial_module_tables.sql' });
        }
        res.status(500).json({ success: false, message: 'Failed to save MCA credentials' });
    }
};

// ---- COMPLIANCES ----

const bulkUpdateCompliances = async (req, res) => {
    try {
        const { company_ids, financial_year, applicability, compliance_type } = req.body;
        if (!Array.isArray(company_ids) || !company_ids.length) {
            return res.status(400).json({ success: false, message: 'company_ids required' });
        }
        const remark = `Applicability: ${applicability || 'n/a'}`;
        for (const cid of company_ids) {
            await pool.query(
                `INSERT INTO filing_status (company_id, financial_year, form_type, status, remarks)
                 VALUES (?, ?, ?, 'pending', ?)`,
                [cid, financial_year, compliance_type || 'general', remark]
            );
        }
        res.json({ success: true, message: `${company_ids.length} filing rows created`, data: { updated: company_ids.length } });
    } catch (error) {
        console.error('bulkUpdateCompliances:', error);
        res.status(500).json({ success: false, message: 'Failed bulk compliance update' });
    }
};

const setComplianceReminder = async (req, res) => {
    try {
        const { compliance_id, company_id, reminder_date, reminder_slot, emails, subject, description } = req.body;
        const emailsJson = JSON.stringify(emails || []);
        const [result] = await pool.query(
            `INSERT INTO secretarial_compliance_reminders_ext
             (compliance_id, company_id, reminder_date, reminder_slot, emails, subject, description)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [compliance_id || null, company_id, reminder_date, reminder_slot || '', emailsJson, subject || '', description || '']
        );
        const [rows] = await pool.query('SELECT * FROM secretarial_compliance_reminders_ext WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('setComplianceReminder:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({ success: false, message: 'Database table missing. Run secretarial_module_tables.sql' });
        }
        res.status(500).json({ success: false, message: 'Failed to set reminder' });
    }
};

// ---- MCA TRANSACTIONS ----

const listMCATransactions = async (req, res) => {
    try {
        const { company_id, search = '' } = req.query;
        let where = '1=1';
        const params = [];
        if (company_id) { where += ' AND company_id = ?'; params.push(company_id); }
        if (search) { where += ' AND (srn LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
        const [rows] = await pool.query(
            `SELECT * FROM secretarial_mca_transactions WHERE ${where} ORDER BY id DESC LIMIT 200`,
            params
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('listMCATransactions:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({ success: false, message: 'Database table missing. Run secretarial_module_tables.sql' });
        }
        res.status(500).json({ success: false, message: 'Failed to list MCA transactions' });
    }
};

const syncMCATransaction = async (req, res) => {
    try {
        const { srn } = req.body;
        if (!srn) return res.status(400).json({ success: false, message: 'srn is required' });
        const [existing] = await pool.query('SELECT * FROM secretarial_mca_transactions WHERE srn = ? LIMIT 1', [srn]);
        if (existing.length) {
            await pool.query(
                'UPDATE secretarial_mca_transactions SET status = ?, receipt_url = ? WHERE id = ?',
                ['synced', `/receipts/${srn}.pdf`, existing[0].id]
            );
            const [rows] = await pool.query('SELECT * FROM secretarial_mca_transactions WHERE id = ?', [existing[0].id]);
            return res.json({ success: true, data: rows[0], message: 'Receipt synced' });
        }
        const [result] = await pool.query(
            `INSERT INTO secretarial_mca_transactions (company_id, srn, status, receipt_url, metadata) VALUES (NULL, ?, 'synced', ?, ?)`,
            [srn, `/receipts/${srn}.json`, JSON.stringify({ synced: true })]
        );
        const [rows] = await pool.query('SELECT * FROM secretarial_mca_transactions WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0], message: 'Receipt synced' });
    } catch (error) {
        console.error('syncMCATransaction:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({ success: false, message: 'Database table missing. Run secretarial_module_tables.sql' });
        }
        res.status(500).json({ success: false, message: 'Failed to sync transaction' });
    }
};

// ---- TENURE ----

const listTenureTracker = async (req, res) => {
    try {
        const { company_id } = req.query;
        let where = '1=1';
        const params = [];
        if (company_id) { where += ' AND company_id = ?'; params.push(company_id); }
        const [rows] = await pool.query(
            `SELECT t.*, co.name as company_name FROM secretarial_tenure_tracker t
             LEFT JOIN companies co ON t.company_id = co.id
             WHERE ${where} ORDER BY t.id DESC`,
            params
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('listTenureTracker:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({ success: false, message: 'Database table missing. Run secretarial_module_tables.sql' });
        }
        res.status(500).json({ success: false, message: 'Failed to list tenure records' });
    }
};

const updateTenureTracker = async (req, res) => {
    try {
        const { start_date, end_date, duration, status } = req.body;
        await pool.query(
            'UPDATE secretarial_tenure_tracker SET start_date=?, end_date=?, duration=?, status=? WHERE id=?',
            [start_date, end_date, duration, status, req.params.id]
        );
        const [rows] = await pool.query('SELECT * FROM secretarial_tenure_tracker WHERE id = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'Tenure record not found' });
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('updateTenureTracker:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({ success: false, message: 'Database table missing. Run secretarial_module_tables.sql' });
        }
        res.status(500).json({ success: false, message: 'Failed to update tenure' });
    }
};

const createTenureTracker = async (req, res) => {
    try {
        const { company_id, label, start_date, end_date, duration, status } = req.body;
        const [result] = await pool.query(
            `INSERT INTO secretarial_tenure_tracker (company_id, label, start_date, end_date, duration, status) VALUES (?, ?, ?, ?, ?, ?)`,
            [company_id || null, label || '', start_date, end_date, duration ?? null, status || '']
        );
        const [rows] = await pool.query('SELECT * FROM secretarial_tenure_tracker WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('createTenureTracker:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({ success: false, message: 'Database table missing. Run secretarial_module_tables.sql' });
        }
        res.status(500).json({ success: false, message: 'Failed to create tenure record' });
    }
};

module.exports = {
    listSearchReports,
    createSearchReport,
    listCSRCalculations,
    createCSRCalculation,
    createDSCBoxSpec,
    listDSCRecordsSpec,
    patchDSCStatusSpec,
    submitDIR3KYC,
    upsertMCACredentials,
    bulkUpdateCompliances,
    setComplianceReminder,
    listMCATransactions,
    syncMCATransaction,
    listTenureTracker,
    updateTenureTracker,
    createTenureTracker
};
