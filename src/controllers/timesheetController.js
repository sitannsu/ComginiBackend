const pool = require('../config/database');

const toNull = (v) => (v === undefined ? null : v);

const getTimesheets = async (req, res) => {
    try {
        const { memberId, clientId, assignmentId, fromDate, toDate, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let where = '1=1';
        const params = [];
        
        if (memberId) { where += ' AND t.member_id = ?'; params.push(memberId); }
        if (clientId) { where += ' AND t.client_id = ?'; params.push(clientId); }
        if (assignmentId) { where += ' AND t.assignment_id = ?'; params.push(assignmentId); }
        if (fromDate) { where += ' AND t.start_date >= ?'; params.push(fromDate); }
        if (toDate) { where += ' AND t.start_date <= ?'; params.push(toDate); }

        const [rows] = await pool.query(
            `SELECT t.*, 
                    u.first_name as member_name, 
                    c.name as client_name, 
                    ch.title as checklist_title
             FROM timesheets t
             LEFT JOIN users u ON t.member_id = u.id
             LEFT JOIN clients c ON t.client_id = c.id
             LEFT JOIN checklist_assignments ca ON t.assignment_id = ca.id
             LEFT JOIN checklists ch ON ca.checklist_id = ch.id
             WHERE ${where} ORDER BY t.start_date DESC, t.start_time DESC LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );
        const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM timesheets t WHERE ${where}`, params);
        
        const mappedData = rows.map(row => {
            // Logic to calculate total hours if start and end times are available
            // Assuming start_time and end_time are in 'HH:mm' format
            let totalHours = 0;
            try {
                const [startH, startM] = row.start_time.split(':').map(Number);
                const [endH, endM] = row.end_time.split(':').map(Number);
                const diffMin = (endH * 60 + endM) - (startH * 60 + startM);
                totalHours = Number((diffMin / 60).toFixed(2));
            } catch (e) {
                // Ignore parsing errors
                console.warn('Calculating total hours failed for timesheet ID:', row.id);
            }
            
            return {
                id: row.id,
                member: row.member_name,
                client: row.client_name,
                assignment: row.checklist_title || 'General Task',
                task: row.task,
                startTime: row.start_time,
                endTime: row.end_time,
                totalHours: totalHours
            };
        });

        res.json({ success: true, message: 'Timesheets fetched successfully', data: mappedData, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
    } catch (error) {
        console.error('Get timesheets error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch timesheets' });
    }
};

const createTimesheet = async (req, res) => {
    try {
        const { memberId, clientId, assignmentId, task, startDate, startTime, endDate, endTime, note } = req.body;
        if (!memberId || !clientId || !task || !startDate || !startTime) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const [result] = await pool.query(
            `INSERT INTO timesheets (member_id, client_id, assignment_id, task, start_date, start_time, end_date, end_time, note)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [memberId, clientId, toNull(assignmentId), task, startDate, startTime, endDate || startDate, endTime || startTime, toNull(note)]
        );

        const [rows] = await pool.query('SELECT * FROM timesheets WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, message: 'Timesheet created successfully', data: rows[0] });
    } catch (error) {
        console.error('Create timesheet error:', error);
        res.status(500).json({ success: false, message: 'Failed to create timesheet' });
    }
};

const getTimesheetSummary = async (req, res) => {
    try {
        const { fromDate, toDate } = req.query;
        let where = '1=1';
        const params = [];
        if (fromDate) { where += ' AND t.start_date >= ?'; params.push(fromDate); }
        if (toDate) { where += ' AND t.start_date <= ?'; params.push(toDate); }

        const [rows] = await pool.query(
            `SELECT t.task, 
                    c.name as client_name, 
                    u.first_name as member_name, 
                    ch.title as checklist_title,
                    SUM(TIMESTAMPDIFF(MINUTE, CONCAT(t.start_date, ' ', t.start_time), CONCAT(t.end_date, ' ', t.end_time))) as total_min
             FROM timesheets t
             LEFT JOIN users u ON t.member_id = u.id
             LEFT JOIN clients c ON t.client_id = c.id
             LEFT JOIN checklist_assignments ca ON t.assignment_id = ca.id
             LEFT JOIN checklists ch ON ca.checklist_id = ch.id
             WHERE ${where}
             GROUP BY t.task, c.name, u.first_name, ch.title
             ORDER BY total_min DESC`,
            params
        );
        
        const mappedData = rows.map(row => {
            const min = row.total_min || 0;
            const hours = Math.floor(min / 60);
            const remainingMin = min % 60;
            return {
                assignment: row.checklist_title || 'General Task',
                client: row.client_name,
                member: row.member_name,
                task: row.task,
                duration: `${hours}h ${remainingMin}m`,
                hours: Number((min / 60).toFixed(2))
            };
        });

        res.json({ success: true, message: 'Summary fetched successfully', data: mappedData });
    } catch (error) {
        console.error('Get timesheet summary error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch summary' });
    }
};

module.exports = { getTimesheets, createTimesheet, getTimesheetSummary };
