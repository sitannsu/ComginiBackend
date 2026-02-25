const pool = require('../config/database');

// ---- MIS REPORTS ----

const getMISReport = async (req, res) => {
    try {
        const { company_id, financial_year, start_date, end_date } = req.query;
        let filingWhere = '1=1';
        const filingParams = [];
        if (company_id) { filingWhere += ' AND fs.company_id = ?'; filingParams.push(company_id); }
        if (financial_year) { filingWhere += ' AND fs.financial_year = ?'; filingParams.push(financial_year); }

        const [filings] = await pool.query(
            `SELECT fs.*, co.name as company_name
             FROM filing_status fs JOIN companies co ON fs.company_id = co.id
             WHERE ${filingWhere} ORDER BY co.name, fs.form_type`,
            filingParams
        );

        const [[{ totalFiled }]] = await pool.query(`SELECT COUNT(*) as totalFiled FROM filing_status fs WHERE status = 'filed' AND ${filingWhere}`, filingParams);
        const [[{ totalPending }]] = await pool.query(`SELECT COUNT(*) as totalPending FROM filing_status fs WHERE status = 'pending' AND ${filingWhere}`, filingParams);
        const [[{ totalOverdue }]] = await pool.query(`SELECT COUNT(*) as totalOverdue FROM filing_status fs WHERE status = 'overdue' AND ${filingWhere}`, filingParams);

        res.json({
            success: true,
            data: {
                summary: { totalFiled, totalPending, totalOverdue, total: totalFiled + totalPending + totalOverdue },
                filings
            }
        });
    } catch (error) {
        console.error('MIS report error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate MIS report' });
    }
};

const getClientProfitabilityReport = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT c.id, c.name as client_name,
                    COALESCE(inv_totals.total_billed, 0) as total_billed,
                    COALESCE(inv_totals.total_paid, 0) as total_paid,
                    COALESCE(time_totals.total_hours, 0) as total_hours
             FROM clients c
             LEFT JOIN (
                 SELECT client_id, SUM(total_amount) as total_billed,
                        SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as total_paid
                 FROM invoices GROUP BY client_id
             ) inv_totals ON c.id = inv_totals.client_id
             LEFT JOIN (
                 SELECT t.client_id, SUM(tl.duration_minutes) / 60 as total_hours
                 FROM task_time_logs tl JOIN tasks t ON tl.task_id = t.id
                 WHERE tl.end_time IS NOT NULL
                 GROUP BY t.client_id
             ) time_totals ON c.id = time_totals.client_id
             WHERE c.status = 'active'
             ORDER BY total_billed DESC`
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Client profitability report error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate client profitability report' });
    }
};

const getTeamEfficiencyReport = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT u.id, u.first_name, u.last_name,
                    COUNT(DISTINCT t.id) as total_tasks,
                    SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
                    COALESCE(SUM(tl.duration_minutes), 0) / 60 as total_hours_logged
             FROM users u
             LEFT JOIN tasks t ON u.id = t.assigned_to
             LEFT JOIN task_time_logs tl ON t.id = tl.task_id AND tl.end_time IS NOT NULL
             WHERE u.is_active = true
             GROUP BY u.id
             ORDER BY completed_tasks DESC`
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Team efficiency report error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate team efficiency report' });
    }
};

// ---- REPORT SCHEDULES ----

const getReportSchedules = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT rs.*, u.first_name as created_by_name
             FROM report_schedules rs LEFT JOIN users u ON rs.created_by = u.id
             ORDER BY rs.created_at DESC`
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get report schedules error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch report schedules' });
    }
};

const createReportSchedule = async (req, res) => {
    try {
        const { report_type, filters, schedule_cron, email_recipients } = req.body;
        const [result] = await pool.query(
            `INSERT INTO report_schedules (report_type, filters, schedule_cron, email_recipients, created_by)
             VALUES (?, ?, ?, ?, ?)`,
            [report_type, JSON.stringify(filters || {}), schedule_cron, email_recipients, req.user.id]
        );
        const [rows] = await pool.query('SELECT * FROM report_schedules WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Create report schedule error:', error);
        res.status(500).json({ success: false, message: 'Failed to create report schedule' });
    }
};

const updateReportSchedule = async (req, res) => {
    try {
        const { report_type, filters, schedule_cron, email_recipients, is_active } = req.body;
        await pool.query(
            'UPDATE report_schedules SET report_type=?, filters=?, schedule_cron=?, email_recipients=?, is_active=? WHERE id=?',
            [report_type, JSON.stringify(filters || {}), schedule_cron, email_recipients, is_active, req.params.id]
        );
        const [rows] = await pool.query('SELECT * FROM report_schedules WHERE id = ?', [req.params.id]);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Update report schedule error:', error);
        res.status(500).json({ success: false, message: 'Failed to update report schedule' });
    }
};

const deleteReportSchedule = async (req, res) => {
    try {
        await pool.query('DELETE FROM report_schedules WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Report schedule deleted' });
    } catch (error) {
        console.error('Delete report schedule error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete report schedule' });
    }
};

module.exports = {
    getMISReport, getClientProfitabilityReport, getTeamEfficiencyReport,
    getReportSchedules, createReportSchedule, updateReportSchedule, deleteReportSchedule
};
