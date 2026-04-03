const pool = require('../config/database');

function mapFormRow(row) {
    return {
        id: row.id,
        serialNo: row.id,
        companyName: row.company_name || null,
        formName: row.form_name,
        teamMember: row.team_member_name || null,
        startDate: row.start_date,
        lastUpdatedAt: row.updated_at,
        status: row.status || null,
        mcaUserId: row.mca_user_id || null
    };
}

/**
 * GET /api/v1/forms
 * Query: search, page, limit, company_id
 */
const listForms = async (req, res) => {
    try {
        const { search = '', page = 1, limit = 10, company_id } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const where = ['1=1'];
        const params = [];

        if (company_id) {
            where.push('f.company_id = ?');
            params.push(company_id);
        }
        const term = String(search).trim();
        if (term) {
            const t = `%${term}%`;
            where.push(
                '(f.form_name LIKE ? OR c.name LIKE ? OR f.team_member_name LIKE ? OR f.status LIKE ? OR f.mca_user_id LIKE ?)'
            );
            params.push(t, t, t, t, t);
        }

        const whereSql = where.join(' AND ');
        const [rows] = await pool.query(
            `SELECT f.*, c.name AS company_name
             FROM secretarial_forms f
             LEFT JOIN companies c ON f.company_id = c.id
             WHERE ${whereSql}
             ORDER BY f.updated_at DESC
             LIMIT ? OFFSET ?`,
            [...params, parseInt(limit, 10), offset]
        );
        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM secretarial_forms f
             LEFT JOIN companies c ON f.company_id = c.id
             WHERE ${whereSql}`,
            params
        );

        const data = rows.map((r) => mapFormRow(r));
        res.json({
            success: true,
            message: '',
            data,
            pagination: {
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                total
            }
        });
    } catch (error) {
        console.error('listForms:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({
                success: false,
                message: 'Run secretarial_forms_dir2.sql to create secretarial_forms',
                data: []
            });
        }
        res.status(500).json({ success: false, message: 'Failed to list forms', data: [] });
    }
};

module.exports = { listForms };
