const pool = require('../config/database');

const getEformFilings = async (req, res) => {
    try {
        const { company_id, form_type, financial_year, status, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let where = '1=1';
        const params = [];
        if (company_id) { where += ' AND ef.company_id = ?'; params.push(company_id); }
        if (form_type) { where += ' AND ef.form_type = ?'; params.push(form_type); }
        if (financial_year) { where += ' AND ef.financial_year = ?'; params.push(financial_year); }
        if (status) { where += ' AND ef.status = ?'; params.push(status); }

        const [rows] = await pool.query(
            `SELECT ef.*, co.name as company_name, d.name as director_name, d.din as director_din, u.first_name as created_by_name
             FROM eform_filings ef
             JOIN companies co ON ef.company_id = co.id
             LEFT JOIN directors d ON ef.signing_director_id = d.id
             LEFT JOIN users u ON ef.created_by = u.id
             WHERE ${where} ORDER BY ef.created_at DESC LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );
        const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM eform_filings ef WHERE ${where}`, params);
        res.json({ success: true, data: rows, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
    } catch (error) {
        console.error('Get eform filings error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch eform filings' });
    }
};

const getEformFilingById = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT ef.*, co.name as company_name, d.name as director_name, d.din as director_din
             FROM eform_filings ef
             JOIN companies co ON ef.company_id = co.id
             LEFT JOIN directors d ON ef.signing_director_id = d.id
             WHERE ef.id = ?`,
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'E-form filing not found' });
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Get eform filing error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch eform filing' });
    }
};

const createEformFiling = async (req, res) => {
    try {
        const { company_id, form_type, financial_year, charge_id, charge_amount, charge_date, signing_director_id, remarks } = req.body;
        const [result] = await pool.query(
            `INSERT INTO eform_filings (company_id, form_type, financial_year, charge_id, charge_amount, charge_date, signing_director_id, remarks, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [company_id, form_type, financial_year, charge_id, charge_amount, charge_date, signing_director_id, remarks, req.user.id]
        );
        const [rows] = await pool.query('SELECT * FROM eform_filings WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Create eform filing error:', error);
        res.status(500).json({ success: false, message: 'Failed to create eform filing' });
    }
};

const updateEformFiling = async (req, res) => {
    try {
        const { form_type, financial_year, charge_id, charge_amount, charge_date, signing_director_id, status, pdf_url, srn, remarks } = req.body;
        await pool.query(
            `UPDATE eform_filings SET form_type=?, financial_year=?, charge_id=?, charge_amount=?, charge_date=?, signing_director_id=?, status=?, pdf_url=?, srn=?, remarks=? WHERE id=?`,
            [form_type, financial_year, charge_id, charge_amount, charge_date, signing_director_id, status, pdf_url, srn, remarks, req.params.id]
        );
        const [rows] = await pool.query('SELECT * FROM eform_filings WHERE id = ?', [req.params.id]);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Update eform filing error:', error);
        res.status(500).json({ success: false, message: 'Failed to update eform filing' });
    }
};

const deleteEformFiling = async (req, res) => {
    try {
        await pool.query('DELETE FROM eform_filings WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'E-form filing deleted' });
    } catch (error) {
        console.error('Delete eform filing error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete eform filing' });
    }
};

module.exports = { getEformFilings, getEformFilingById, createEformFiling, updateEformFiling, deleteEformFiling };
