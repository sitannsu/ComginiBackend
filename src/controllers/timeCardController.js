const pool = require('../config/database');

const toNull = (v) => (v === undefined ? null : v);

const parseUserId = (raw) => {
    if (raw == null || raw === '') return null;
    const s = String(raw);
    const n = s.startsWith('user_') ? parseInt(s.slice(5), 10) : parseInt(s, 10);
    return Number.isNaN(n) || n < 1 ? null : n;
};

const parseTcId = (raw) => {
    if (raw == null || raw === '') return null;
    const s = String(raw);
    const n = s.startsWith('tc_') ? parseInt(s.slice(3), 10) : parseInt(s, 10);
    return Number.isNaN(n) || n < 1 ? null : n;
};

const migrationHint = 'If tables are missing, run: mysql ... < src/database/deploy_modules_leads_finance_hr.sql';

const sendDbError = (res, error, fallbackMessage) => {
    if (error.code === 'ER_NO_SUCH_TABLE' || error.errno === 1146) {
        return res.status(503).json({
            success: false,
            message: `${fallbackMessage} Database table missing. ${migrationHint}`,
            code: 'MIGRATION_REQUIRED'
        });
    }
    return res.status(500).json({ success: false, message: fallbackMessage });
};

const fmtTime = (t) => {
    if (!t) return null;
    return String(t).slice(0, 5);
};

const minutesBetween = (inDate, inTime, outDate, outTime) => {
    if (!inDate || !inTime || !outDate || !outTime) return null;
    const a = new Date(`${inDate}T${fmtTime(inTime)}:00`);
    const b = new Date(`${outDate}T${fmtTime(outTime)}:00`);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
    return Math.max(0, (b - a) / 60000);
};

const formatDurationHHMM = (totalMinutes) => {
    const h = Math.floor(totalMinutes / 60);
    const m = Math.round(totalMinutes % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const memberName = (row) =>
    row.member_name
        ? String(row.member_name).trim()
        : `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Unknown';

const mapListRow = (row) => {
    const mins = minutesBetween(row.in_date, row.in_time, row.out_date, row.out_time);
    return {
        id: `tc_${row.id}`,
        member: memberName(row),
        in_date: row.in_date,
        in_time: fmtTime(row.in_time),
        out_date: row.out_date,
        out_time: row.out_time ? fmtTime(row.out_time) : null,
        duration: mins != null ? formatDurationHHMM(mins) : null
    };
};

const getTimeCards = async (req, res) => {
    try {
        const q = req.query;
        const page = parseInt(q.page || 1, 10);
        const limit = parseInt(q.limit || 10, 10);
        const offset = (page - 1) * limit;
        const member_id = q.member_id;
        const from = q.from;
        const to = q.to;
        const month = q.month;
        const year = q.year;
        const search = q.search;

        let where = '1=1';
        const params = [];
        if (member_id) {
            where += ' AND tc.user_id = ?';
            params.push(parseUserId(member_id));
        }
        if (month && year) {
            where += ' AND MONTH(tc.in_date) = ? AND YEAR(tc.in_date) = ?';
            params.push(parseInt(month, 10), parseInt(year, 10));
        } else {
            if (from) {
                where += ' AND tc.in_date >= ?';
                params.push(from);
            }
            if (to) {
                where += ' AND tc.in_date <= ?';
                params.push(to);
            }
        }
        if (search) {
            where += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR CONCAT(u.first_name, " ", u.last_name) LIKE ?)';
            const s = `%${search}%`;
            params.push(s, s, s);
        }

        const [rows] = await pool.query(
            `SELECT tc.*,
                    TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS member_name,
                    u.first_name, u.last_name
             FROM time_cards tc
             JOIN users u ON tc.user_id = u.id
             WHERE ${where}
             ORDER BY tc.in_date DESC, tc.in_time DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM time_cards tc JOIN users u ON tc.user_id = u.id WHERE ${where}`,
            params
        );

        res.json({
            success: true,
            data: rows.map(mapListRow),
            pagination: { total, page, limit }
        });
    } catch (error) {
        console.error('Get time cards error:', error);
        sendDbError(res, error, 'Failed to fetch time cards');
    }
};

const createTimeCard = async (req, res) => {
    try {
        const b = req.body;
        const user_id = parseUserId(b.member_id ?? b.memberId);
        const mode = b.mode === 'WFH' ? 'WFH' : 'WFO';
        const in_date = b.in_date;
        const in_time = b.in_time;
        const out_date = b.out_date;
        const out_time = b.out_time;
        const note = b.note;

        if (!user_id || !in_date || !in_time) {
            return res.status(400).json({ success: false, message: 'member_id, in_date, in_time are required' });
        }

        const [result] = await pool.query(
            `INSERT INTO time_cards (user_id, \`mode\`, in_date, in_time, out_date, out_time, note)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [user_id, mode, in_date, in_time, out_date || null, out_time || null, toNull(note)]
        );
        res.status(201).json({
            success: true,
            message: 'Time card created',
            data: { id: `tc_${result.insertId}` }
        });
    } catch (error) {
        console.error('Create time card error:', error);
        sendDbError(res, error, 'Failed to create time card');
    }
};

const updateTimeCard = async (req, res) => {
    try {
        const id = parseTcId(req.params.id);
        if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
        const b = req.body;
        const fields = [];
        const values = [];
        if (b.mode !== undefined) {
            fields.push('`mode`=?');
            values.push(b.mode === 'WFH' ? 'WFH' : 'WFO');
        }
        if (b.in_date !== undefined) {
            fields.push('in_date=?');
            values.push(b.in_date);
        }
        if (b.in_time !== undefined) {
            fields.push('in_time=?');
            values.push(b.in_time);
        }
        if (b.out_date !== undefined) {
            fields.push('out_date=?');
            values.push(b.out_date);
        }
        if (b.out_time !== undefined) {
            fields.push('out_time=?');
            values.push(b.out_time);
        }
        if (b.note !== undefined) {
            fields.push('note=?');
            values.push(b.note);
        }
        if (b.member_id !== undefined || b.memberId !== undefined) {
            fields.push('user_id=?');
            values.push(parseUserId(b.member_id ?? b.memberId));
        }
        if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });
        values.push(id);
        await pool.query(`UPDATE time_cards SET ${fields.join(', ')} WHERE id=?`, values);
        const [rows] = await pool.query(
            `SELECT tc.*,
                    TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS member_name,
                    u.first_name, u.last_name
             FROM time_cards tc JOIN users u ON tc.user_id = u.id WHERE tc.id = ?`,
            [id]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Time card not found' });
        res.json({ success: true, message: 'Time card updated', data: mapListRow(rows[0]) });
    } catch (error) {
        console.error('Update time card error:', error);
        sendDbError(res, error, 'Failed to update time card');
    }
};

const deleteTimeCard = async (req, res) => {
    try {
        const id = parseTcId(req.params.id);
        if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
        const [r] = await pool.query('DELETE FROM time_cards WHERE id = ?', [id]);
        if (r.affectedRows === 0) return res.status(404).json({ success: false, message: 'Time card not found' });
        res.json({ success: true, message: 'Time card deleted successfully' });
    } catch (error) {
        console.error('Delete time card error:', error);
        sendDbError(res, error, 'Failed to delete time card');
    }
};

const getSummary = async (req, res) => {
    try {
        const q = req.query;
        const member_id = q.member_id;
        const from = q.from;
        const to = q.to;
        let where = 'tc.out_time IS NOT NULL';
        const params = [];
        if (member_id) {
            where += ' AND tc.user_id = ?';
            params.push(parseUserId(member_id));
        }
        if (from) {
            where += ' AND tc.in_date >= ?';
            params.push(from);
        }
        if (to) {
            where += ' AND tc.in_date <= ?';
            params.push(to);
        }

        const [rows] = await pool.query(
            `SELECT
                tc.user_id,
                MAX(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')))) AS member_name,
                MAX(u.first_name) AS first_name,
                MAX(u.last_name) AS last_name,
                SUM(TIMESTAMPDIFF(
                    MINUTE,
                    CONCAT(tc.in_date, ' ', tc.in_time),
                    CONCAT(tc.out_date, ' ', tc.out_time)
                )) AS total_min
             FROM time_cards tc
             JOIN users u ON tc.user_id = u.id
             WHERE ${where}
             GROUP BY tc.user_id
             ORDER BY tc.user_id`,
            params
        );

        const data = rows.map((row) => {
            const min = row.total_min != null ? Number(row.total_min) : 0;
            return {
                member: memberName(row),
                duration: formatDurationHHMM(min),
                hours: Number((min / 60).toFixed(2))
            };
        });
        res.json({ success: true, data });
    } catch (error) {
        console.error('Time cards summary error:', error);
        sendDbError(res, error, 'Failed to fetch summary');
    }
};

const getSummaryDetails = async (req, res) => {
    try {
        const q = req.query;
        const member_id = q.member_id;
        const from = q.from;
        const to = q.to;
        if (!member_id) {
            return res.status(400).json({ success: false, message: 'member_id is required' });
        }
        let where = 'tc.user_id = ? AND tc.out_time IS NOT NULL';
        const params = [parseUserId(member_id)];
        if (from) {
            where += ' AND tc.in_date >= ?';
            params.push(from);
        }
        if (to) {
            where += ' AND tc.in_date <= ?';
            params.push(to);
        }

        const [rows] = await pool.query(
            `SELECT tc.in_date AS d,
                    SUM(TIMESTAMPDIFF(
                        MINUTE,
                        CONCAT(tc.in_date, ' ', tc.in_time),
                        CONCAT(tc.out_date, ' ', tc.out_time)
                    )) AS total_min
             FROM time_cards tc
             WHERE ${where}
             GROUP BY tc.in_date
             ORDER BY tc.in_date`,
            params
        );

        const data = rows.map((row) => {
            const min = row.total_min != null ? Number(row.total_min) : 0;
            return {
                date: row.d,
                duration: formatDurationHHMM(min),
                hours: Number((min / 60).toFixed(2))
            };
        });
        res.json({ success: true, data });
    } catch (error) {
        console.error('Summary details error:', error);
        sendDbError(res, error, 'Failed to fetch summary details');
    }
};

const getUserReport = async (req, res) => {
    try {
        const q = req.query;
        const member_id = q.member_id;
        const from = q.from;
        const to = q.to;
        if (!from || !to) {
            return res.status(400).json({ success: false, message: 'from and to are required' });
        }

        let where = 'tc.in_date BETWEEN ? AND ?';
        const params = [from, to];
        if (member_id) {
            where += ' AND tc.user_id = ?';
            params.push(parseUserId(member_id));
        }

        const [rows] = await pool.query(
            `SELECT
                tc.user_id,
                MAX(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')))) AS member_name,
                MAX(u.first_name) AS first_name,
                MAX(u.last_name) AS last_name,
                COUNT(DISTINCT tc.in_date) AS present_days,
                SUM(CASE WHEN tc.\`mode\` = 'WFO' THEN 1 ELSE 0 END) AS wfo_rows,
                SUM(CASE WHEN tc.\`mode\` = 'WFH' THEN 1 ELSE 0 END) AS wfh_rows
             FROM time_cards tc
             JOIN users u ON tc.user_id = u.id
             WHERE ${where}
             GROUP BY tc.user_id`,
            params
        );

        const dayMs = 86400000;
        const total_days = Math.floor((new Date(to) - new Date(from)) / dayMs) + 1;

        const data = rows.map((row) => {
            const present = Number(row.present_days) || 0;
            return {
                member: memberName(row),
                total_days,
                working_days: total_days,
                present,
                wfo: Number(row.wfo_rows) || 0,
                wfh: Number(row.wfh_rows) || 0,
                absent: Math.max(0, total_days - present),
                overtime: 0,
                leave_without_pay: 0
            };
        });
        res.json({ success: true, data });
    } catch (error) {
        console.error('User report error:', error);
        sendDbError(res, error, 'Failed to fetch user report');
    }
};

const getUserSummaryDetails = async (req, res) => {
    try {
        const q = req.query;
        const member_id = q.member_id;
        const from = q.from;
        const to = q.to;
        if (!member_id) {
            return res.status(400).json({ success: false, message: 'member_id is required' });
        }
        let where = 'tc.user_id = ? AND tc.out_time IS NOT NULL';
        const params = [parseUserId(member_id)];
        if (from) {
            where += ' AND tc.in_date >= ?';
            params.push(from);
        }
        if (to) {
            where += ' AND tc.in_date <= ?';
            params.push(to);
        }

        const [rows] = await pool.query(
            `SELECT tc.in_date AS date,
                    tc.in_time, tc.out_time,
                    tc.note,
                    TIMESTAMPDIFF(
                        MINUTE,
                        CONCAT(tc.in_date, ' ', tc.in_time),
                        CONCAT(tc.out_date, ' ', tc.out_time)
                    ) AS total_min
             FROM time_cards tc
             WHERE ${where}
             ORDER BY tc.in_date, tc.in_time`,
            params
        );

        const data = rows.map((row) => {
            const min = row.total_min != null ? Number(row.total_min) : 0;
            return {
                date: row.date,
                in_time: fmtTime(row.in_time),
                out_time: fmtTime(row.out_time),
                duration: formatDurationHHMM(min),
                description: row.note || ''
            };
        });
        res.json({ success: true, data });
    } catch (error) {
        console.error('User summary details error:', error);
        sendDbError(res, error, 'Failed to fetch user summary details');
    }
};

const getMembersLogged = async (req, res) => {
    try {
        const q = req.query;
        const day = q.from || q.date || new Date().toISOString().slice(0, 10);

        const [rows] = await pool.query(
            `SELECT tc.user_id,
                    MIN(tc.in_time) AS first_in,
                    MAX(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')))) AS member_name,
                    MAX(u.first_name) AS first_name,
                    MAX(u.last_name) AS last_name
             FROM time_cards tc
             JOIN users u ON tc.user_id = u.id
             WHERE tc.in_date = ?
             GROUP BY tc.user_id
             ORDER BY MIN(tc.in_time)`,
            [day]
        );

        const data = rows.map((row) => ({
            member: memberName(row),
            in_date: day,
            in_time: fmtTime(row.first_in)
        }));
        res.json({ success: true, data });
    } catch (error) {
        console.error('Members logged error:', error);
        sendDbError(res, error, 'Failed to fetch members logged');
    }
};

const logIn = async (req, res) => {
    try {
        const user_id = parseUserId(req.body.member_id ?? req.body.memberId);
        if (!user_id) return res.status(400).json({ success: false, message: 'member_id is required' });

        const [[u]] = await pool.query('SELECT id FROM users WHERE id = ? LIMIT 1', [user_id]);
        if (!u) return res.status(400).json({ success: false, message: 'Invalid member_id (user not found)' });

        const [open] = await pool.query(
            'SELECT id FROM time_cards WHERE user_id = ? AND out_time IS NULL ORDER BY id DESC LIMIT 1',
            [user_id]
        );
        if (open.length > 0) {
            return res.status(400).json({ success: false, message: 'Already logged in; clock out first' });
        }

        const mode = req.body.mode === 'WFH' ? 'WFH' : 'WFO';
        const [result] = await pool.query(
            `INSERT INTO time_cards (user_id, \`mode\`, in_date, in_time, out_date, out_time)
             VALUES (?, ?, CURDATE(), CURTIME(), NULL, NULL)`,
            [user_id, mode]
        );
        res.status(201).json({
            success: true,
            message: 'Logged in',
            data: { id: `tc_${result.insertId}` }
        });
    } catch (error) {
        console.error('Log in error:', error);
        if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.errno === 1452) {
            return res.status(400).json({ success: false, message: 'Invalid member_id (user not found)' });
        }
        sendDbError(res, error, 'Failed to log in');
    }
};

const logOut = async (req, res) => {
    try {
        const user_id = parseUserId(req.body.member_id ?? req.body.memberId);
        if (!user_id) return res.status(400).json({ success: false, message: 'member_id is required' });

        const [open] = await pool.query(
            'SELECT id FROM time_cards WHERE user_id = ? AND out_time IS NULL ORDER BY id DESC LIMIT 1',
            [user_id]
        );
        if (open.length === 0) {
            return res.status(400).json({ success: false, message: 'No open session to close' });
        }

        await pool.query(
            `UPDATE time_cards SET out_date = CURDATE(), out_time = CURTIME()
             WHERE id = ?`,
            [open[0].id]
        );
        res.json({ success: true, message: 'Logged out', data: { id: `tc_${open[0].id}` } });
    } catch (error) {
        console.error('Log out error:', error);
        sendDbError(res, error, 'Failed to log out');
    }
};

module.exports = {
    getTimeCards,
    createTimeCard,
    updateTimeCard,
    deleteTimeCard,
    getSummary,
    getSummaryDetails,
    getUserReport,
    getUserSummaryDetails,
    getMembersLogged,
    logIn,
    logOut
};
