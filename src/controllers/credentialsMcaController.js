const pool = require('../config/database');

function maskPassword(p) {
    return p ? '********' : null;
}

function mapLlpRow(row, includeSecret) {
    return {
        id: row.id,
        llpName: row.llp_name || null,
        llpin: row.llpin || null,
        userId: row.user_id || null,
        password: includeSecret ? row.password : maskPassword(row.password),
        pan: row.pan || null,
        email: row.email || null,
        contactNo: row.contact_no || null,
        partnerMailId: row.partner_mail_id || null,
        partnerNameForOtp: row.partner_name_for_otp || null,
        partnerPhNo: row.partner_ph_no || null,
        hintQuestion: row.hint_question || null,
        hintAnswer: includeSecret ? row.hint_answer : row.hint_answer ? '********' : null,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function mapCompanyRow(row, includeSecret) {
    return {
        id: row.id,
        companyName: row.company_name || null,
        cin: row.cin || null,
        userId: row.user_id || null,
        password: includeSecret ? row.password : maskPassword(row.password),
        pan: row.pan || null,
        email: row.email || null,
        contactNo: row.contact_no || null,
        directorNameForOtp: row.director_name_for_otp || null,
        directorMailId: row.director_mail_id || null,
        directorPhNo: row.director_ph_no || null,
        hintQuestion: row.hint_question || null,
        hintAnswer: includeSecret ? row.hint_answer : row.hint_answer ? '********' : null,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

/** GET /api/v1/llp/credentials */
const listLlpCredentials = async (req, res) => {
    try {
        const { search = '', page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const where = ['1=1'];
        const params = [];
        const term = String(search).trim();
        if (term) {
            const t = `%${term}%`;
            where.push(
                '(llp_name LIKE ? OR llpin LIKE ? OR pan LIKE ? OR email LIKE ? OR contact_no LIKE ? OR user_id LIKE ? OR partner_name_for_otp LIKE ?)'
            );
            params.push(t, t, t, t, t, t, t);
        }
        const whereSql = where.join(' AND ');
        const [rows] = await pool.query(
            `SELECT * FROM secretarial_llp_mca_credentials WHERE ${whereSql} ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
            [...params, parseInt(limit, 10), offset]
        );
        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM secretarial_llp_mca_credentials WHERE ${whereSql}`,
            params
        );
        res.json({
            success: true,
            message: '',
            data: rows.map((r) => mapLlpRow(r, false)),
            pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total }
        });
    } catch (error) {
        console.error('listLlpCredentials:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({
                success: false,
                message: 'Run credentials_and_bulk_campaigns.sql',
                data: []
            });
        }
        res.status(500).json({ success: false, message: 'Failed to list LLP credentials', data: [] });
    }
};

/** POST /api/v1/llp/credentials */
const createLlpCredentials = async (req, res) => {
    try {
        const b = req.body;
        const llpin = (b.llpin || b.LLPIN || '').trim();
        if (!llpin) {
            return res.status(400).json({ success: false, message: 'llpin is required' });
        }
        const cols = {
            llp_name: b.llpName ?? b.llp_name ?? null,
            user_id: b.userId ?? b.user_id ?? null,
            password: b.password ?? null,
            pan: b.pan ?? null,
            email: b.email ?? null,
            contact_no: b.contactNo ?? b.contact_no ?? null,
            partner_mail_id: b.partnerMailId ?? b.partner_mail_id ?? null,
            partner_name_for_otp: b.partnerNameForOtp ?? b.partner_name_for_otp ?? null,
            partner_ph_no: b.partnerPhNo ?? b.partner_ph_no ?? null,
            hint_question: b.hintQuestion ?? b.hint_question ?? null,
            hint_answer: b.hintAnswer ?? b.hint_answer ?? null
        };

        const [existing] = await pool.query('SELECT id FROM secretarial_llp_mca_credentials WHERE llpin = ?', [llpin]);
        if (existing.length) {
            await pool.query(
                `UPDATE secretarial_llp_mca_credentials SET
                 llp_name=?, user_id=?, password=?, pan=?, email=?, contact_no=?,
                 partner_mail_id=?, partner_name_for_otp=?, partner_ph_no=?, hint_question=?, hint_answer=?
                 WHERE llpin=?`,
                [
                    cols.llp_name,
                    cols.user_id,
                    cols.password,
                    cols.pan,
                    cols.email,
                    cols.contact_no,
                    cols.partner_mail_id,
                    cols.partner_name_for_otp,
                    cols.partner_ph_no,
                    cols.hint_question,
                    cols.hint_answer,
                    llpin
                ]
            );
        } else {
            await pool.query(
                `INSERT INTO secretarial_llp_mca_credentials
                (llpin, llp_name, user_id, password, pan, email, contact_no, partner_mail_id, partner_name_for_otp, partner_ph_no, hint_question, hint_answer)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
                [
                    llpin,
                    cols.llp_name,
                    cols.user_id,
                    cols.password,
                    cols.pan,
                    cols.email,
                    cols.contact_no,
                    cols.partner_mail_id,
                    cols.partner_name_for_otp,
                    cols.partner_ph_no,
                    cols.hint_question,
                    cols.hint_answer
                ]
            );
        }
        const [rows] = await pool.query('SELECT * FROM secretarial_llp_mca_credentials WHERE llpin = ?', [llpin]);
        res.status(existing.length ? 200 : 201).json({
            success: true,
            message: '',
            data: mapLlpRow(rows[0], true)
        });
    } catch (error) {
        console.error('createLlpCredentials:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({ success: false, message: 'Run credentials_and_bulk_campaigns.sql' });
        }
        res.status(500).json({ success: false, message: 'Failed to save LLP credentials' });
    }
};

/** GET /api/v1/company/credentials */
const listCompanyCredentials = async (req, res) => {
    try {
        const { search = '', page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const where = ['1=1'];
        const params = [];
        const term = String(search).trim();
        if (term) {
            const t = `%${term}%`;
            where.push(
                '(company_name LIKE ? OR cin LIKE ? OR pan LIKE ? OR email LIKE ? OR contact_no LIKE ? OR user_id LIKE ? OR director_name_for_otp LIKE ?)'
            );
            params.push(t, t, t, t, t, t, t);
        }
        const whereSql = where.join(' AND ');
        const [rows] = await pool.query(
            `SELECT * FROM secretarial_company_mca_credentials WHERE ${whereSql} ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
            [...params, parseInt(limit, 10), offset]
        );
        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM secretarial_company_mca_credentials WHERE ${whereSql}`,
            params
        );
        res.json({
            success: true,
            message: ' ',
            data: rows.map((r) => mapCompanyRow(r, false)),
            pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total }
        });
    } catch (error) {
        console.error('listCompanyCredentials:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({
                success: false,
                message: 'Run credentials_and_bulk_campaigns.sql',
                data: []
            });
        }
        res.status(500).json({ success: false, message: 'Failed to list company credentials', data: [] });
    }
};

/** POST /api/v1/company/credentials */
const createCompanyCredentials = async (req, res) => {
    try {
        const b = req.body;
        const cin = (b.cin || b.CIN || '').trim();
        if (!cin) {
            return res.status(400).json({ success: false, message: 'cin is required' });
        }
        const cols = {
            company_name: b.companyName ?? b.company_name ?? null,
            user_id: b.userId ?? b.user_id ?? null,
            password: b.password ?? null,
            pan: b.pan ?? null,
            email: b.email ?? null,
            contact_no: b.contactNo ?? b.contact_no ?? null,
            director_name_for_otp: b.directorNameForOtp ?? b.director_name_for_otp ?? null,
            director_mail_id: b.directorMailId ?? b.director_mail_id ?? null,
            director_ph_no: b.directorPhNo ?? b.director_ph_no ?? null,
            hint_question: b.hintQuestion ?? b.hint_question ?? null,
            hint_answer: b.hintAnswer ?? b.hint_answer ?? null
        };

        const [existing] = await pool.query('SELECT id FROM secretarial_company_mca_credentials WHERE cin = ?', [cin]);
        if (existing.length) {
            await pool.query(
                `UPDATE secretarial_company_mca_credentials SET
                 company_name=?, user_id=?, password=?, pan=?, email=?, contact_no=?,
                 director_name_for_otp=?, director_mail_id=?, director_ph_no=?, hint_question=?, hint_answer=?
                 WHERE cin=?`,
                [
                    cols.company_name,
                    cols.user_id,
                    cols.password,
                    cols.pan,
                    cols.email,
                    cols.contact_no,
                    cols.director_name_for_otp,
                    cols.director_mail_id,
                    cols.director_ph_no,
                    cols.hint_question,
                    cols.hint_answer,
                    cin
                ]
            );
        } else {
            await pool.query(
                `INSERT INTO secretarial_company_mca_credentials
                (cin, company_name, user_id, password, pan, email, contact_no, director_name_for_otp, director_mail_id, director_ph_no, hint_question, hint_answer)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
                [
                    cin,
                    cols.company_name,
                    cols.user_id,
                    cols.password,
                    cols.pan,
                    cols.email,
                    cols.contact_no,
                    cols.director_name_for_otp,
                    cols.director_mail_id,
                    cols.director_ph_no,
                    cols.hint_question,
                    cols.hint_answer
                ]
            );
        }
        const [rows] = await pool.query('SELECT * FROM secretarial_company_mca_credentials WHERE cin = ?', [cin]);
        res.status(existing.length ? 200 : 201).json({
            success: true,
            message: '',
            data: mapCompanyRow(rows[0], true)
        });
    } catch (error) {
        console.error('createCompanyCredentials:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({ success: false, message: 'Run credentials_and_bulk_campaigns.sql' });
        }
        res.status(500).json({ success: false, message: 'Failed to save company credentials' });
    }
};

function escapeCsv(v) {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

/** GET /api/v1/company/credentials/export — CSV download */
const exportCompanyCredentialsCsv = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM secretarial_company_mca_credentials ORDER BY updated_at DESC'
        );
        const headers = [
            'cin',
            'company_name',
            'user_id',
            'password',
            'pan',
            'email',
            'contact_no',
            'director_name_for_otp',
            'director_mail_id',
            'director_ph_no',
            'hint_question',
            'hint_answer',
            'updated_at'
        ];
        let csv = `${headers.join(',')}\n`;
        for (const r of rows) {
            csv += `${headers.map((h) => escapeCsv(r[h])).join(',')}\n`;
        }
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="company-mca-credentials.csv"');
        res.send(csv);
    } catch (error) {
        console.error('exportCompanyCredentialsCsv:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({ success: false, message: 'Run credentials_and_bulk_campaigns.sql' });
        }
        res.status(500).json({ success: false, message: 'Export failed' });
    }
};

module.exports = {
    listLlpCredentials,
    createLlpCredentials,
    listCompanyCredentials,
    createCompanyCredentials,
    exportCompanyCredentialsCsv
};
