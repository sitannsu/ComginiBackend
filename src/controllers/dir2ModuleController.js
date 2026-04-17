const pool = require('../config/database');

function mapDir2Row(row) {
    const d = row.date_of_appointment;
    const dateOfAppointment =
        d && typeof d === 'string' ? d.slice(0, 10) : d instanceof Date ? d.toISOString().slice(0, 10) : null;
    return {
        id: row.id,
        companyName: row.company_name || null,
        appointeeName: row.appointee_name || row.name || null,
        dateOfAppointment,
        date: dateOfAppointment,
        dir2Status: row.dir2_status || null
    };
}

/**
 * GET /api/v1/dir2
 * Query: search, page, limit
 */
const listDir2 = async (req, res) => {
    try {
        const { search = '', page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const where = ['1=1'];
        const params = [];

        const term = String(search).trim();
        if (term) {
            const t = `%${term}%`;
            where.push(
                '(d.company_name LIKE ? OR d.appointee_name LIKE ? OR d.name LIKE ? OR d.din LIKE ? OR d.pan LIKE ? OR d.dir2_status LIKE ?)'
            );
            params.push(t, t, t, t, t, t);
        }

        const whereSql = where.join(' AND ');
        const [rows] = await pool.query(
            `SELECT d.* FROM secretarial_dir2 d
             WHERE ${whereSql}
             ORDER BY d.updated_at DESC
             LIMIT ? OFFSET ?`,
            [...params, parseInt(limit, 10), offset]
        );
        const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM secretarial_dir2 d WHERE ${whereSql}`, params);

        const data = rows.map((r) => mapDir2Row(r));
        res.json({
            success: true,
            message: 'Success',
            data,
            pagination: {
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                total
            }
        });
    } catch (error) {
        console.error('listDir2:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({
                success: false,
                message: 'Run secretarial_forms_dir2.sql to create secretarial_dir2',
                data: []
            });
        }
        res.status(500).json({ success: false, message: 'Failed to list DIR-2 records', data: [] });
    }
};

/**
 * POST /api/v1/dir2
 * Body: { din, name, pan }
 */
const createDir2 = async (req, res) => {
    try {
        const { din, name, appointeeName, pan, company_id, companyId, company_name, companyName, date, date_of_appointment, dateOfAppointment } =
            req.body;

        const finalName = name || appointeeName;
        if (!finalName || !String(finalName).trim()) {
            return res.status(400).json({ success: false, message: 'name/appointeeName is required' });
        }

        const cid = company_id ?? companyId ?? null;
        const cname = company_name ?? companyName ?? null;
        const doa = date ?? date_of_appointment ?? dateOfAppointment ?? null;
        const dinVal = din != null && String(din).trim() ? String(din).trim() : null;
        const panVal = pan != null && String(pan).trim() ? String(pan).trim().toUpperCase() : null;

        const [result] = await pool.query(
            `INSERT INTO secretarial_dir2
            (company_id, company_name, appointee_name, din, pan, name, date_of_appointment, dir2_status, particulars)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
            [
                cid,
                cname ? String(cname).trim() : null,
                String(finalName).trim(),
                dinVal,
                panVal,
                String(finalName).trim(),
                doa || null,
                JSON.stringify({ submitted: { din: dinVal, name: String(finalName).trim(), pan: panVal } })
            ]
        );
        const [rows] = await pool.query('SELECT * FROM secretarial_dir2 WHERE id = ?', [result.insertId]);
        res.status(201).json({
            success: true,
            message: ' ',
            data: mapDir2Row(rows[0])
        });
    } catch (error) {
        console.error('createDir2:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({ success: false, message: 'Run secretarial_forms_dir2.sql' });
        }
        res.status(500).json({ success: false, message: 'Failed to create DIR-2 record' });
    }
};

module.exports = { listDir2, createDir2 };
