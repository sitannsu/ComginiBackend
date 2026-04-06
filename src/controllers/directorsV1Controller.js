const pool = require('../config/database');

/** Accepts YYYY-MM-DD or d/m/yyyy; returns YYYY-MM-DD or null */
function normalizeAppointmentDate(val) {
    if (val === undefined || val === null || val === '') return null;
    if (typeof val !== 'string') return val;
    const s = val.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
        const d = m[1].padStart(2, '0');
        const mo = m[2].padStart(2, '0');
        const y = m[3];
        return `${y}-${mo}-${d}`;
    }
    return null;
}

function mapDirectorRow(r) {
    return {
        id: r.id,
        name: r.name,
        din: r.din || null,
        designation: r.designation || null,
        appointmentDate: r.appointment_date,
        tenureYears: r.tenure_years,
        status: r.is_active ? 'Active' : 'Inactive',
        companyId: r.company_id,
        companyName: r.company_name || null
    };
}

/** GET /api/v1/directors — query: search, companyId (required) */
const listDirectors = async (req, res) => {
    try {
        const { search = '', companyId } = req.query;
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'companyId is required' });
        }
        const cid = parseInt(companyId, 10);
        if (Number.isNaN(cid)) {
            return res.status(400).json({ success: false, message: 'companyId must be a number' });
        }
        const where = ['d.company_id = ?'];
        const params = [cid];
        const term = String(search).trim();
        if (term) {
            const t = `%${term}%`;
            where.push('(d.name LIKE ? OR d.din LIKE ? OR d.designation LIKE ?)');
            params.push(t, t, t);
        }
        const whereSql = where.join(' AND ');
        const [rows] = await pool.query(
            `SELECT d.*, c.name AS company_name FROM directors d
             JOIN companies c ON d.company_id = c.id
             WHERE ${whereSql}
             ORDER BY d.is_active DESC, d.name ASC`,
            params
        );
        res.json({
            success: true,
            message: '',
            data: rows.map((r) => mapDirectorRow(r))
        });
    } catch (error) {
        console.error('listDirectors:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch directors', data: [] });
    }
};

/** POST /api/v1/directors — body includes companyId */
const createDirector = async (req, res) => {
    try {
        const {
            companyId,
            company_id,
            din,
            name,
            designation,
            appointmentDate,
            appointment_date,
            tenure,
            tenure_years
        } = req.body;
        const cid = companyId ?? company_id;
        if (!cid) {
            return res.status(400).json({ success: false, message: 'companyId is required' });
        }
        const company_id_num = parseInt(cid, 10);
        if (Number.isNaN(company_id_num)) {
            return res.status(400).json({ success: false, message: 'companyId must be a number' });
        }
        if (!name || !String(name).trim()) {
            return res.status(400).json({ success: false, message: 'name is required' });
        }
        const rawAd = appointmentDate ?? appointment_date ?? null;
        const ad = normalizeAppointmentDate(rawAd);
        if (rawAd != null && String(rawAd).trim() !== '' && ad === null) {
            return res.status(400).json({
                success: false,
                message:
                    'appointmentDate must be YYYY-MM-DD or dd/mm/yyyy (e.g. 30/01/2002)'
            });
        }
        let tenureVal = tenure_years;
        if (tenureVal === undefined || tenureVal === null) {
            tenureVal = tenure !== undefined && tenure !== null && tenure !== '' ? parseInt(tenure, 10) : 0;
        }
        if (Number.isNaN(tenureVal)) tenureVal = 0;

        const [result] = await pool.query(
            `INSERT INTO directors (company_id, din, name, designation, appointment_date, cessation_date, tenure_years)
             VALUES (?, ?, ?, ?, ?, NULL, ?)`,
            [company_id_num, din || null, String(name).trim(), designation || null, ad, tenureVal]
        );
        const [rows] = await pool.query(
            `SELECT d.*, c.name AS company_name FROM directors d
             JOIN companies c ON d.company_id = c.id WHERE d.id = ?`,
            [result.insertId]
        );
        res.status(201).json({
            success: true,
            message: ' ',
            data: mapDirectorRow(rows[0])
        });
    } catch (error) {
        console.error('createDirector:', error);
        if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.errno === 1452) {
            return res.status(400).json({ success: false, message: 'Invalid companyId — use an existing companies.id' });
        }
        if (error.code === 'ER_TRUNCATED_WRONG_VALUE' || error.errno === 1366) {
            return res.status(400).json({
                success: false,
                message: 'Invalid appointmentDate or field value — use YYYY-MM-DD or dd/mm/yyyy'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Failed to create director',
            ...(process.env.NODE_ENV === 'development' && { detail: error.message })
        });
    }
};

module.exports = { listDirectors, createDirector };
