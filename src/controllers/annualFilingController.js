const pool = require('../config/database');

/** GET /api/v1/annual-filing */
const listAnnualFiling = async (req, res) => {
    try {
        const { search = '', page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const where = ['1=1'];
        const params = [];
        const term = String(search).trim();
        if (term) {
            const t = `%${term}%`;
            where.push('(client_name LIKE ? OR cin LIKE ?)');
            params.push(t, t);
        }
        const whereSql = where.join(' AND ');
        const [rows] = await pool.query(
            `SELECT id, client_name, cin, submitted_at, submitted_from, metadata
             FROM secretarial_annual_filing_submissions
             WHERE ${whereSql}
             ORDER BY submitted_at DESC
             LIMIT ? OFFSET ?`,
            [...params, parseInt(limit, 10), offset]
        );
        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM secretarial_annual_filing_submissions WHERE ${whereSql}`,
            params
        );
        const items = rows.map((r) => ({
            id: r.id,
            clientName: r.client_name,
            cin: r.cin,
            submittedAt: r.submitted_at,
            submittedFrom: r.submitted_from || null
        }));
        res.json({
            success: true,
            message: '',
            data: { items, total }
        });
    } catch (error) {
        console.error('listAnnualFiling:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({
                success: false,
                message: 'Run annual_filing.sql',
                data: { items: [], total: 0 }
            });
        }
        res.status(500).json({ success: false, message: 'Failed to list annual filing', data: { items: [], total: 0 } });
    }
};

/** POST /api/v1/annual-filing/status */
const postAnnualFilingStatus = async (req, res) => {
    try {
        const { mcaUser, companyId, cin } = req.body;
        let compId = null;
        if (companyId != null && String(companyId).trim() !== '') {
            const n = parseInt(companyId, 10);
            compId = Number.isNaN(n) ? null : n;
        }
        const [result] = await pool.query(
            `INSERT INTO secretarial_annual_filing_status_checks (mca_user, company_id, cin, result_json)
             VALUES (?, ?, ?, ?)`,
            [
                mcaUser != null ? String(mcaUser) : null,
                compId,
                cin != null ? String(cin).trim() : null,
                JSON.stringify({ status: 'pending', note: 'MCA integration stub — replace with live MCA response.' })
            ]
        );
        const [rows] = await pool.query('SELECT * FROM secretarial_annual_filing_status_checks WHERE id = ?', [
            result.insertId
        ]);
        res.status(201).json({
            success: true,
            message: '',
            data: rows[0]
        });
    } catch (error) {
        console.error('postAnnualFilingStatus:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({ success: false, message: 'Run annual_filing.sql' });
        }
        res.status(500).json({ success: false, message: 'Failed to record annual filing status check' });
    }
};

module.exports = { listAnnualFiling, postAnnualFilingStatus };
