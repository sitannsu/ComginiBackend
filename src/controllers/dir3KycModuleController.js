const pool = require('../config/database');

/**
 * GET /api/v1/dir3-kyc
 * List DIR-3 KYC rows from directors + companies + optional secretarial_dir3_kyc
 */
const listDir3Kyc = async (req, res) => {
    try {
        const {
            din,
            companyId,
            groupId: _groupId,
            kycStatus,
            search,
            page = 1,
            limit = 10
        } = req.query;

        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const where = ['1=1'];
        const params = [];

        if (din) {
            where.push('d.din LIKE ?');
            params.push(`%${String(din).trim()}%`);
        }
        if (companyId) {
            where.push('d.company_id = ?');
            params.push(companyId);
        }
        if (search) {
            where.push('(d.name LIKE ? OR d.din LIKE ? OR co.name LIKE ?)');
            const t = `%${String(search).trim()}%`;
            params.push(t, t, t);
        }
        if (kycStatus) {
            const ks = String(kycStatus).toLowerCase();
            if (ks === 'completed') {
                where.push('k.is_kyc_done = 1');
            } else if (ks === 'pending') {
                where.push('(k.id IS NULL OR k.is_kyc_done IS NULL OR k.is_kyc_done = 0)');
            }
        }

        const whereSql = where.join(' AND ');

        const listSql = `
            SELECT
                d.id AS director_id,
                d.name AS director_name,
                d.din,
                d.is_active,
                co.id AS company_id,
                co.name AS company_name,
                k.id AS kyc_row_id,
                k.is_kyc_done,
                k.status AS kyc_remarks_status,
                k.pan AS kyc_pan
            FROM directors d
            INNER JOIN companies co ON d.company_id = co.id
            LEFT JOIN secretarial_dir3_kyc k ON k.din = d.din
            WHERE ${whereSql}
            ORDER BY d.name ASC
            LIMIT ? OFFSET ?
        `;

        const countSql = `
            SELECT COUNT(*) AS total
            FROM directors d
            INNER JOIN companies co ON d.company_id = co.id
            LEFT JOIN secretarial_dir3_kyc k ON k.din = d.din
            WHERE ${whereSql}
        `;

        const [rows] = await pool.query(listSql, [...params, parseInt(limit, 10), offset]);
        const [[{ total }]] = await pool.query(countSql, params);

        const data = rows.map((r) => {
            let kyc = 'Pending';
            if (r.is_kyc_done) kyc = 'Completed';
            else if (r.kyc_remarks_status) kyc = r.kyc_remarks_status;

            return {
                id: String(r.director_id),
                directorName: r.director_name,
                din: r.din || '',
                dinStatus: r.is_active ? 'Active' : 'Inactive',
                kycStatus: kyc,
                assignedUser: null,
                userStatus: r.is_active ? 'active' : 'inactive',
                companyId: String(r.company_id),
                companyName: r.company_name,
                pan: r.kyc_pan || null
            };
        });

        res.json({
            success: true,
            data,
            pagination: {
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                total
            }
        });
    } catch (error) {
        console.error('listDir3Kyc:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({
                success: false,
                message: 'Database tables missing. Run secretarial_module_tables.sql and dir3_mca_api_extensions.sql'
            });
        }
        res.status(500).json({ success: false, message: 'Failed to fetch DIR-3 KYC list' });
    }
};

module.exports = { listDir3Kyc };
