const pool = require('../config/database');

// ---- TASKS ----

const getTasks = async (req, res) => {
    try {
        const { status, priority, assigned_to, client_id, company_id, search, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let where = '1=1';
        const params = [];
        if (status) { where += ' AND t.status = ?'; params.push(status); }
        if (priority) { where += ' AND t.priority = ?'; params.push(priority); }
        if (assigned_to) { where += ' AND t.assigned_to = ?'; params.push(assigned_to); }
        if (client_id) { where += ' AND t.client_id = ?'; params.push(client_id); }
        if (company_id) { where += ' AND t.company_id = ?'; params.push(company_id); }
        if (search) { where += ' AND (t.title LIKE ? OR t.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

        const [rows] = await pool.query(
            `SELECT t.*, 
                    ua.first_name as assigned_to_name, ub.first_name as assigned_by_name,
                    cl.name as client_name, co.name as company_name
             FROM tasks t
             LEFT JOIN users ua ON t.assigned_to = ua.id
             LEFT JOIN users ub ON t.assigned_by = ub.id
             LEFT JOIN clients cl ON t.client_id = cl.id
             LEFT JOIN companies co ON t.company_id = co.id
             WHERE ${where} ORDER BY FIELD(t.priority,'urgent','high','medium','low'), t.due_date ASC LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );
        const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM tasks t WHERE ${where}`, params);
        res.json({ success: true, data: rows, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch tasks' });
    }
};

const getTaskById = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT t.*, ua.first_name as assigned_to_name, ub.first_name as assigned_by_name,
                    cl.name as client_name, co.name as company_name
             FROM tasks t
             LEFT JOIN users ua ON t.assigned_to = ua.id
             LEFT JOIN users ub ON t.assigned_by = ub.id
             LEFT JOIN clients cl ON t.client_id = cl.id
             LEFT JOIN companies co ON t.company_id = co.id
             WHERE t.id = ?`, [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Task not found' });
        const [comments] = await pool.query(
            `SELECT tc.*, u.first_name, u.last_name FROM task_comments tc JOIN users u ON tc.user_id = u.id WHERE tc.task_id = ? ORDER BY tc.created_at`,
            [req.params.id]
        );
        const [timeLogs] = await pool.query(
            `SELECT tl.*, u.first_name FROM task_time_logs tl JOIN users u ON tl.user_id = u.id WHERE tl.task_id = ? ORDER BY tl.start_time DESC`,
            [req.params.id]
        );
        res.json({ success: true, data: { ...rows[0], comments, timeLogs } });
    } catch (error) {
        console.error('Get task error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch task' });
    }
};

const createTask = async (req, res) => {
    try {
        const { title, description, client_id, company_id, assigned_to, priority, status, due_date, estimated_hours, category } = req.body;
        if (!title || typeof title !== 'string' || title.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'title is required' });
        }

        // mysql2 does not allow `undefined` in bind parameters.
        const toNull = (v) => (v === undefined ? null : v);
        const [result] = await pool.query(
            `INSERT INTO tasks (title, description, client_id, company_id, assigned_to, assigned_by, priority, status, due_date, estimated_hours, category)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title.trim(),
                toNull(description),
                toNull(client_id),
                toNull(company_id),
                toNull(assigned_to),
                toNull(req.user?.id),
                priority || 'medium',
                status || 'todo',
                toNull(due_date),
                toNull(estimated_hours),
                toNull(category),
            ]
        );
        const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ success: false, message: 'Failed to create task' });
    }
};

const updateTask = async (req, res) => {
    try {
        const { title, description, client_id, company_id, assigned_to, priority, status, due_date, estimated_hours, actual_hours, category } = req.body;
        const completedAt = status === 'completed' ? new Date() : null;
        await pool.query(
            `UPDATE tasks SET title=?, description=?, client_id=?, company_id=?, assigned_to=?, priority=?, status=?, due_date=?, estimated_hours=?, actual_hours=?, category=?, completed_at=? WHERE id=?`,
            [title, description, client_id, company_id, assigned_to, priority, status, due_date, estimated_hours, actual_hours, category, completedAt, req.params.id]
        );
        const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({ success: false, message: 'Failed to update task' });
    }
};

const deleteTask = async (req, res) => {
    try {
        await pool.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Task deleted' });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete task' });
    }
};

// ---- TASK COMMENTS ----

const addComment = async (req, res) => {
    try {
        const { comment } = req.body;
        const [result] = await pool.query(
            'INSERT INTO task_comments (task_id, user_id, comment) VALUES (?, ?, ?)',
            [req.params.taskId, req.user.id, comment]
        );
        const [rows] = await pool.query(
            'SELECT tc.*, u.first_name, u.last_name FROM task_comments tc JOIN users u ON tc.user_id = u.id WHERE tc.id = ?',
            [result.insertId]
        );
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ success: false, message: 'Failed to add comment' });
    }
};

// ---- TIME LOGS ----

const startTimer = async (req, res) => {
    try {
        const [result] = await pool.query(
            'INSERT INTO task_time_logs (task_id, user_id, start_time) VALUES (?, ?, NOW())',
            [req.params.taskId, req.user.id]
        );
        await pool.query('UPDATE tasks SET status = "in_progress" WHERE id = ? AND status = "todo"', [req.params.taskId]);
        const [rows] = await pool.query('SELECT * FROM task_time_logs WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Start timer error:', error);
        res.status(500).json({ success: false, message: 'Failed to start timer' });
    }
};

const stopTimer = async (req, res) => {
    try {
        await pool.query(
            `UPDATE task_time_logs SET end_time = NOW(), duration_minutes = TIMESTAMPDIFF(MINUTE, start_time, NOW()), notes = ?
             WHERE id = ? AND user_id = ? AND end_time IS NULL`,
            [req.body.notes || null, req.params.logId, req.user.id]
        );
        const [rows] = await pool.query('SELECT * FROM task_time_logs WHERE id = ?', [req.params.logId]);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Stop timer error:', error);
        res.status(500).json({ success: false, message: 'Failed to stop timer' });
    }
};

// ---- CALL LOGS ----

const getCallLogs = async (req, res) => {
    try {
        const { client_id, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let where = '1=1';
        const params = [];
        if (client_id) { where += ' AND cl.client_id = ?'; params.push(client_id); }
        const [rows] = await pool.query(
            `SELECT cl.*, c.name as client_name, u.first_name as logged_by_name
             FROM call_logs cl LEFT JOIN clients c ON cl.client_id = c.id LEFT JOIN users u ON cl.logged_by = u.id
             WHERE ${where} ORDER BY cl.start_time DESC LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get call logs error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch call logs' });
    }
};

const createCallLog = async (req, res) => {
    try {
        const { client_id, contact_person, mobile_number, start_time, end_time, duration_minutes, notes } = req.body;
        const [result] = await pool.query(
            'INSERT INTO call_logs (client_id, contact_person, mobile_number, start_time, end_time, duration_minutes, notes, logged_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [client_id, contact_person, mobile_number, start_time, end_time, duration_minutes, notes, req.user.id]
        );
        const [rows] = await pool.query('SELECT * FROM call_logs WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Create call log error:', error);
        res.status(500).json({ success: false, message: 'Failed to create call log' });
    }
};

// ---- TIMESHEETS ----

const getTimesheets = async (req, res) => {
    try {
        const { user_id, client_id, start_date, end_date } = req.query;
        let where = 'tl.end_time IS NOT NULL';
        const params = [];
        if (user_id) { where += ' AND tl.user_id = ?'; params.push(user_id); }
        if (client_id) { where += ' AND t.client_id = ?'; params.push(client_id); }
        if (start_date) { where += ' AND tl.start_time >= ?'; params.push(start_date); }
        if (end_date) { where += ' AND tl.end_time <= ?'; params.push(end_date); }

        const [rows] = await pool.query(
            `SELECT u.first_name, u.last_name, c.name as client_name, 
                    SUM(tl.duration_minutes) as total_minutes, COUNT(DISTINCT t.id) as tasks_worked
             FROM task_time_logs tl
             JOIN tasks t ON tl.task_id = t.id
             JOIN users u ON tl.user_id = u.id
             LEFT JOIN clients c ON t.client_id = c.id
             WHERE ${where}
             GROUP BY tl.user_id, t.client_id
             ORDER BY total_minutes DESC`,
            params
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get timesheets error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch timesheets' });
    }
};

module.exports = {
    getTasks, getTaskById, createTask, updateTask, deleteTask,
    addComment, startTimer, stopTimer,
    getCallLogs, createCallLog, getTimesheets
};
