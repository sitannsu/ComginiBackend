const pool = require('../config/database');

const getDownloads = async (req, res) => {
    try {
        const { company_id, status, financial_year, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let where = '1=1';
        const params = [];
        if (company_id) { where += ' AND md.company_id = ?'; params.push(company_id); }
        if (status) { where += ' AND md.status = ?'; params.push(status); }
        if (financial_year) { where += ' AND md.financial_year = ?'; params.push(financial_year); }

        const [rows] = await pool.query(
            `SELECT md.*, co.name as company_name, u.first_name as requested_by_name
             FROM mca_downloads md
             JOIN companies co ON md.company_id = co.id
             LEFT JOIN users u ON md.requested_by = u.id
             WHERE ${where} ORDER BY md.created_at DESC LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );
        const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM mca_downloads md WHERE ${where}`, params);
        res.json({ success: true, data: rows, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
    } catch (error) {
        console.error('Get MCA downloads error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch MCA downloads' });
    }
};

const requestDownload = async (req, res) => {
    try {
        const { company_id, srn, download_type, financial_year } = req.body;
        const [result] = await pool.query(
            `INSERT INTO mca_downloads (company_id, srn, download_type, financial_year, status, requested_by)
             VALUES (?, ?, ?, ?, 'queued', ?)`,
            [company_id, srn, download_type, financial_year, req.user.id]
        );
        const [rows] = await pool.query('SELECT * FROM mca_downloads WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0], message: 'Download queued' });
    } catch (error) {
        console.error('Request MCA download error:', error);
        res.status(500).json({ success: false, message: 'Failed to queue download' });
    }
};

const updateDownloadStatus = async (req, res) => {
    try {
        const { status, file_url, error_message } = req.body;
        const completedAt = status === 'completed' ? new Date() : null;
        await pool.query(
            'UPDATE mca_downloads SET status=?, file_url=?, error_message=?, completed_at=? WHERE id=?',
            [status, file_url, error_message, completedAt, req.params.id]
        );
        const [rows] = await pool.query('SELECT * FROM mca_downloads WHERE id = ?', [req.params.id]);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Update MCA download error:', error);
        res.status(500).json({ success: false, message: 'Failed to update download status' });
    }
};

const searchCompany = async (req, res) => {
    try {
        const { query = '' } = req.query;
        const term = `%${String(query).trim()}%`;
        const [rows] = await pool.query(
            `SELECT id, name FROM companies WHERE (name LIKE ? OR cin LIKE ? OR llpin LIKE ?) ORDER BY name LIMIT 10`,
            [term, term, term]
        );
        res.json({ success: true, message: 'Data fetched successfully', data: rows });
    } catch (error) {
        console.error('Search company error:', error);
        res.status(500).json({ success: false, message: 'Failed to search company' });
    }
};

module.exports = { getDownloads, requestDownload, updateDownloadStatus, searchCompany };
