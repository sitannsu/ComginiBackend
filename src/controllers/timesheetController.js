const pool = require('../config/database');

const toNull = (v) => (v === undefined ? null : v);

const parseId = (raw) => {
    if (raw == null || raw === '') return null;
    const s = String(raw);
    if (s.startsWith('ts_')) return parseInt(s.slice(3), 10);
    if (s.startsWith('user_')) return parseInt(s.slice(5), 10);
    if (s.startsWith('client_')) return parseInt(s.slice(7), 10);
    return parseInt(s, 10);
};

const toIsoDateTime = (dateStr, timeVal) => {
    if (!dateStr || !timeVal) return null;
    let t = String(timeVal);
    if (t.length === 5) t += ':00';
    return `${dateStr}T${t.slice(0, 8)}`;
};

const diffHours = (startDate, startTime, endDate, endTime) => {
    try {
        const sd = startDate;
        const ed = endDate || startDate;
        const st = String(startTime).slice(0, 8);
        const et = String(endTime || startTime).slice(0, 8);
        const a = new Date(`${sd}T${st.length === 5 ? `${st}:00` : st}`);
        const b = new Date(`${ed}T${et.length === 5 ? `${et}:00` : et}`);
        return Math.max(0, (b - a) / 3600000);
    } catch {
        return 0;
    }
};

const mapRow = (row) => {
    const total_hours = Number(
        diffHours(row.start_date, row.start_time, row.end_date, row.end_time).toFixed(2)
    );
    return {
        id: `ts_${row.id}`,
        member: row.member_name ? `${row.member_name}`.trim() : null,
        client: row.client_name || null,
        task: row.task,
        start_time: toIsoDateTime(row.start_date, row.start_time),
        end_time: toIsoDateTime(row.end_date || row.start_date, row.end_time || row.start_time),
        total_hours
    };
};

const getTimesheets = async (req, res) => {
    try {
        const q = req.query;
        const page = parseInt(q.page || 1, 10);
        const limit = parseInt(q.limit || 10, 10);
        const member_id = q.member_id ?? q.memberId;
        const client_id = q.client_id ?? q.clientId;
        const assignment_id = q.assignment_id ?? q.assignmentId;
        const from = q.from ?? q.fromDate;
        const to = q.to ?? q.toDate;
        const search = q.search;

        const offset = (page - 1) * limit;
        let where = '1=1';
        const params = [];

        if (member_id) {
            where += ' AND t.member_id = ?';
            params.push(parseId(member_id));
        }
        if (client_id) {
            where += ' AND t.client_id = ?';
            params.push(parseId(client_id));
        }
        if (assignment_id) {
            where += ' AND t.assignment_id = ?';
            params.push(parseId(assignment_id));
        }
        if (from) {
            where += ' AND t.start_date >= ?';
            params.push(from);
        }
        if (to) {
            where += ' AND t.start_date <= ?';
            params.push(to);
        }
        if (search) {
            where += ' AND (t.task LIKE ? OR t.note LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        const [rows] = await pool.query(
            `SELECT t.*,
                    TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS member_name,
                    c.name AS client_name,
                    ch.title AS checklist_title
             FROM timesheets t
             LEFT JOIN users u ON t.member_id = u.id
             LEFT JOIN clients c ON t.client_id = c.id
             LEFT JOIN checklist_assignments ca ON t.assignment_id = ca.id
             LEFT JOIN checklists ch ON ca.checklist_id = ch.id
             WHERE ${where}
             ORDER BY t.start_date DESC, t.start_time DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
        const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM timesheets t WHERE ${where}`, params);

        res.json({
            success: true,
            data: {
                total,
                page,
                limit,
                timesheets: rows.map(mapRow)
            }
        });
    } catch (error) {
        console.error('Get timesheets error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch timesheets' });
    }
};

const createTimesheet = async (req, res) => {
    try {
        const b = req.body;
        const member_id = parseId(b.member_id ?? b.memberId);
        const client_id = parseId(b.client_id ?? b.clientId);
        const assignment_id = b.assignment_id != null || b.assignmentId != null
            ? parseId(b.assignment_id ?? b.assignmentId)
            : null;
        const task = b.task;
        const start_date = b.start_date ?? b.startDate;
        const start_time = b.start_time ?? b.startTime;
        const end_date = b.end_date ?? b.endDate;
        const end_time = b.end_time ?? b.endTime;
        const note = b.note;

        if (!member_id || !client_id || !task || !start_date || !start_time) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: member_id, client_id, task, start_date, start_time'
            });
        }

        const [result] = await pool.query(
            `INSERT INTO timesheets (member_id, client_id, assignment_id, task, start_date, start_time, end_date, end_time, note)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                member_id,
                client_id,
                toNull(assignment_id),
                task,
                start_date,
                start_time,
                end_date || start_date,
                end_time || start_time,
                toNull(note)
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Timesheet created successfully',
            data: { id: `ts_${result.insertId}` }
        });
    } catch (error) {
        console.error('Create timesheet error:', error);
        res.status(500).json({ success: false, message: 'Failed to create timesheet' });
    }
};

const updateTimesheet = async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
        const b = req.body;
        const fields = [];
        const values = [];
        const set = (col, val) => {
            if (val !== undefined) {
                fields.push(`${col}=?`);
                values.push(val);
            }
        };
        if (b.task !== undefined) set('task', b.task);
        if (b.note !== undefined) set('note', b.note);
        if (b.member_id !== undefined || b.memberId !== undefined) set('member_id', parseId(b.member_id ?? b.memberId));
        if (b.client_id !== undefined || b.clientId !== undefined) set('client_id', parseId(b.client_id ?? b.clientId));
        if (b.assignment_id !== undefined || b.assignmentId !== undefined) {
            set('assignment_id', parseId(b.assignment_id ?? b.assignmentId));
        }
        if (b.start_date !== undefined || b.startDate !== undefined) set('start_date', b.start_date ?? b.startDate);
        if (b.start_time !== undefined || b.startTime !== undefined) set('start_time', b.start_time ?? b.startTime);
        if (b.end_date !== undefined || b.endDate !== undefined) set('end_date', b.end_date ?? b.endDate);
        if (b.end_time !== undefined || b.endTime !== undefined) set('end_time', b.end_time ?? b.endTime);

        if (fields.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields to update' });
        }
        values.push(id);
        await pool.query(`UPDATE timesheets SET ${fields.join(', ')} WHERE id=?`, values);
        const [rows] = await pool.query(
            `SELECT t.*,
                    TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS member_name,
                    c.name AS client_name
             FROM timesheets t
             LEFT JOIN users u ON t.member_id = u.id
             LEFT JOIN clients c ON t.client_id = c.id
             WHERE t.id = ?`,
            [id]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Timesheet not found' });
        res.json({ success: true, message: 'Timesheet updated successfully', data: mapRow(rows[0]) });
    } catch (error) {
        console.error('Update timesheet error:', error);
        res.status(500).json({ success: false, message: 'Failed to update timesheet' });
    }
};

const deleteTimesheet = async (req, res) => {
    try {
        const id = parseId(req.params.id);
        if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
        const [r] = await pool.query('DELETE FROM timesheets WHERE id = ?', [id]);
        if (r.affectedRows === 0) return res.status(404).json({ success: false, message: 'Timesheet not found' });
        res.json({ success: true, message: 'Timesheet deleted successfully' });
    } catch (error) {
        console.error('Delete timesheet error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete timesheet' });
    }
};

const formatDurationHHMM = (totalMinutes) => {
    const h = Math.floor(totalMinutes / 60);
    const m = Math.round(totalMinutes % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const getTimesheetSummary = async (req, res) => {
    try {
        const q = req.query;
        const member_id = q.member_id ?? q.memberId;
        const from = q.from ?? q.fromDate;
        const to = q.to ?? q.toDate;

        let where = '1=1';
        const params = [];
        if (member_id) {
            where += ' AND t.member_id = ?';
            params.push(parseId(member_id));
        }
        if (from) {
            where += ' AND t.start_date >= ?';
            params.push(from);
        }
        if (to) {
            where += ' AND t.start_date <= ?';
            params.push(to);
        }

        const [rows] = await pool.query(
            `SELECT
                TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS member_name,
                COUNT(*) AS tasks_worked,
                SUM(TIMESTAMPDIFF(
                    MINUTE,
                    CONCAT(t.start_date, ' ', t.start_time),
                    CONCAT(COALESCE(t.end_date, t.start_date), ' ', COALESCE(t.end_time, t.start_time))
                )) AS total_min
             FROM timesheets t
             LEFT JOIN users u ON t.member_id = u.id
             WHERE ${where}
             GROUP BY t.member_id, u.first_name, u.last_name
             ORDER BY member_name`,
            params
        );

        const data = rows.map((row) => {
            const min = row.total_min != null ? Number(row.total_min) : 0;
            const hours = Number((min / 60).toFixed(2));
            return {
                member: row.member_name || 'Unknown',
                tasks_worked: Number(row.tasks_worked) || 0,
                total_duration: formatDurationHHMM(min),
                hours
            };
        });

        res.json({ success: true, data });
    } catch (error) {
        console.error('Get timesheet summary error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch summary' });
    }
};

module.exports = {
    getTimesheets,
    createTimesheet,
    updateTimesheet,
    deleteTimesheet,
    getTimesheetSummary
};
