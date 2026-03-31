const pool = require('../config/database');

// ---- DASHBOARD WIDGETS ----

const getWidgets = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM dashboard_widgets WHERE user_id = ? ORDER BY position',
            [req.user.id]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get widgets error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch widgets' });
    }
};

const updateWidgets = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const { widgets } = req.body;
        await conn.query('DELETE FROM dashboard_widgets WHERE user_id = ?', [req.user.id]);
        for (const w of widgets) {
            await conn.query(
                'INSERT INTO dashboard_widgets (user_id, widget_type, position, config, is_visible) VALUES (?, ?, ?, ?, ?)',
                [req.user.id, w.widget_type, w.position, JSON.stringify(w.config || {}), w.is_visible !== false]
            );
        }
        res.json({ success: true, message: 'Widgets updated' });
    } catch (error) {
        console.error('Update widgets error:', error);
        res.status(500).json({ success: false, message: 'Failed to update widgets' });
    } finally {
        conn.release();
    }
};

// ---- PRIVATE NOTES ----

const getNotes = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM private_notes WHERE user_id = ? ORDER BY is_pinned DESC, updated_at DESC',
            [req.user.id]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get notes error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch notes' });
    }
};

const createNote = async (req, res) => {
    try {
        const { title, content, color } = req.body;
        const [result] = await pool.query(
            'INSERT INTO private_notes (user_id, title, content, color) VALUES (?, ?, ?, ?)',
            [req.user.id, title, content, color || '#FFFF00']
        );
        const [rows] = await pool.query('SELECT * FROM private_notes WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Create note error:', error);
        res.status(500).json({ success: false, message: 'Failed to create note' });
    }
};

const updateNote = async (req, res) => {
    try {
        const { title, content, color, is_pinned } = req.body;
        await pool.query(
            'UPDATE private_notes SET title = ?, content = ?, color = ?, is_pinned = ? WHERE id = ? AND user_id = ?',
            [title, content, color, is_pinned || false, req.params.id, req.user.id]
        );
        const [rows] = await pool.query('SELECT * FROM private_notes WHERE id = ?', [req.params.id]);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Update note error:', error);
        res.status(500).json({ success: false, message: 'Failed to update note' });
    }
};

const deleteNote = async (req, res) => {
    try {
        await pool.query('DELETE FROM private_notes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ success: true, message: 'Note deleted' });
    } catch (error) {
        console.error('Delete note error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete note' });
    }
};

// ---- SOCIAL FEED ----

const getFeed = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const [rows] = await pool.query(
            `SELECT sf.*, u.first_name, u.last_name, u.email
             FROM social_feed sf JOIN users u ON sf.user_id = u.id
             ORDER BY sf.created_at DESC LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM social_feed');
        res.json({ success: true, data: rows, pagination: { page, limit, total } });
    } catch (error) {
        console.error('Get feed error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch feed' });
    }
};

const createPost = async (req, res) => {
    try {
        const { content, attachment_url } = req.body;
        const [result] = await pool.query(
            'INSERT INTO social_feed (user_id, content, attachment_url) VALUES (?, ?, ?)',
            [req.user.id, content, attachment_url]
        );
        const [rows] = await pool.query(
            `SELECT sf.*, u.first_name, u.last_name FROM social_feed sf JOIN users u ON sf.user_id = u.id WHERE sf.id = ?`,
            [result.insertId]
        );
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({ success: false, message: 'Failed to create post' });
    }
};

const deletePost = async (req, res) => {
    try {
        await pool.query('DELETE FROM social_feed WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ success: true, message: 'Post deleted' });
    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete post' });
    }
};

// ---- DASHBOARD SUMMARY ----

const getDashboardSummary = async (req, res) => {
    try {
        const [[{ totalClients }]] = await pool.query('SELECT COUNT(*) as totalClients FROM clients WHERE status = "active"');
        const [[{ totalTasks }]] = await pool.query('SELECT COUNT(*) as totalTasks FROM tasks WHERE status != "completed" AND status != "cancelled"');
        const [[{ overdueTasks }]] = await pool.query('SELECT COUNT(*) as overdueTasks FROM tasks WHERE due_date < CURDATE() AND status != "completed" AND status != "cancelled"');
        const [[{ upcomingEvents }]] = await pool.query('SELECT COUNT(*) as upcomingEvents FROM events WHERE start_datetime >= NOW() AND start_datetime <= DATE_ADD(NOW(), INTERVAL 7 DAY)');
        const [[{ pendingFilings }]] = await pool.query('SELECT COUNT(*) as pendingFilings FROM filing_status WHERE status = "pending" OR status = "overdue"');
        const [[{ openTickets }]] = await pool.query('SELECT COUNT(*) as openTickets FROM support_tickets WHERE status = "open" OR status = "in_progress"');

        res.json({
            success: true,
            data: {
                totalClients, totalTasks, overdueTasks, upcomingEvents, pendingFilings, openTickets,
                pendingApproval: pendingFilings,
                pendingReview: totalTasks,
                inRequest: upcomingEvents,
                executed: totalClients,
                pendingSignature: openTickets,
                furtherProcessing: overdueTasks
            }
        });
    } catch (error) {
        console.error('Dashboard summary error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard summary' });
    }
};

const getDashboardTasks = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, title, priority, status
             FROM tasks
             ORDER BY updated_at DESC
             LIMIT 10`
        );
        res.json({ success: true, message: 'Success', data: rows });
    } catch (error) {
        console.error('Dashboard tasks error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard tasks' });
    }
};

const getDashboardUpdates = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const [rows] = await pool.query(
            `SELECT title, DATE(created_at) as date
             FROM tasks
             ORDER BY created_at DESC
             LIMIT ?`,
            [limit]
        );
        res.json({ success: true, message: 'Success', data: rows });
    } catch (error) {
        console.error('Dashboard updates error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard updates' });
    }
};

const getDashboardStats = async (req, res) => {
    try {
        const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM tasks');
        const [[{ completed }]] = await pool.query('SELECT COUNT(*) as completed FROM tasks WHERE status = "completed"');
        const [[{ pending }]] = await pool.query('SELECT COUNT(*) as pending FROM tasks WHERE status = "todo" OR status = "in_progress"');
        const [[{ overdue }]] = await pool.query('SELECT COUNT(*) as overdue FROM tasks WHERE due_date < CURDATE() AND status != "completed"');

        const [activities] = await pool.query(
            `SELECT title as activity, created_at as timestamp FROM tasks ORDER BY created_at DESC LIMIT 5`
        );

        res.json({
            success: true,
            data: {
                tasks: { total, completed, pending, overdue },
                recent_activities: activities,
                kpis: {
                    efficiency: completed > 0 ? Math.round((completed / total) * 100) : 0,
                    avg_task_time: '4.5h'
                }
            }
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
    }
};

const getDashboardPayments = async (req, res) => {
    try {
        const [[{ total_receivable }]] = await pool.query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE payment_status = 'pending'`);
        const [[{ total_received }]] = await pool.query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE payment_status = 'paid'`);
        const [recent_payments] = await pool.query(
            `SELECT invoice_number, total_amount, payment_status, payment_date FROM invoices ORDER BY payment_date DESC LIMIT 5`
        );
        res.json({
            success: true,
            data: {
                summary: { total_receivable, total_received },
                recent_payments: recent_payments
            }
        });
    } catch (error) {
        console.error('Dashboard payments error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard payments' });
    }
};

const getDashboardIncomeExpense = async (req, res) => {
    try {
        const [income] = await pool.query(
            `SELECT DATE_FORMAT(payment_date, '%b') as month, SUM(total_amount) as amount FROM invoices WHERE payment_status = 'paid' AND payment_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH) GROUP BY month ORDER BY MIN(payment_date)`
        );
        const [expense] = await pool.query(
            `SELECT DATE_FORMAT(expense_date, '%b') as month, SUM(amount) as amount FROM expenses WHERE expense_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH) GROUP BY month ORDER BY MIN(expense_date)`
        );
        res.json({
            success: true,
            data: { income, expense }
        });
    } catch (error) {
        console.error('Dashboard income-expense error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch income-expense' });
    }
};

const getDashboardFinanceBreakdown = async (req, res) => {
    try {
        const [breakdown] = await pool.query(
            `SELECT category as label, SUM(amount) as value FROM expenses GROUP BY category`
        );
        res.json({
            success: true,
            data: breakdown
        });
    } catch (error) {
        console.error('Dashboard finance breakdown error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch finance breakdown' });
    }
};

const getFinanceOverview = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT DATE_FORMAT(expense_date, '%b') as month_label, SUM(amount) as total
             FROM expenses
             GROUP BY DATE_FORMAT(expense_date, '%Y-%m'), DATE_FORMAT(expense_date, '%b')
             ORDER BY DATE_FORMAT(expense_date, '%Y-%m')
             LIMIT 12`
        );
        res.json({
            success: true,
            message: 'Success',
            data: {
                months: rows.map(r => r.month_label),
                values: rows.map(r => Number(r.total))
            }
        });
    } catch (error) {
        console.error('Finance overview error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch finance overview' });
    }
};

const getExpenseBreakdown = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT
                SUM(CASE WHEN LOWER(category) LIKE '%team%' THEN amount ELSE 0 END) as teamProject,
                SUM(CASE WHEN LOWER(category) LIKE '%operat%' THEN amount ELSE 0 END) as operational,
                SUM(CASE WHEN LOWER(category) LIKE '%market%' THEN amount ELSE 0 END) as marketing
             FROM expenses`
        );
        const r = rows[0] || {};
        res.json({
            success: true,
            message: 'Success',
            data: {
                teamProject: Number(r.teamProject || 0),
                operational: Number(r.operational || 0),
                marketing: Number(r.marketing || 0)
            }
        });
    } catch (error) {
        console.error('Expense breakdown error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch expense breakdown' });
    }
};

module.exports = {
    getWidgets, updateWidgets,
    getNotes, createNote, updateNote, deleteNote,
    getFeed, createPost, deletePost,
    getDashboardSummary, getDashboardTasks, getDashboardUpdates, getFinanceOverview, getExpenseBreakdown,
    getDashboardStats, getDashboardPayments, getDashboardIncomeExpense, getDashboardFinanceBreakdown
};
