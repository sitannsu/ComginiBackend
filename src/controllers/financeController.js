const pool = require('../config/database');

// ---- INVOICES ----

const getInvoices = async (req, res) => {
    try {
        const { client_id, payment_status, search, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let where = '1=1';
        const params = [];
        if (client_id) { where += ' AND inv.client_id = ?'; params.push(client_id); }
        if (payment_status) { where += ' AND inv.payment_status = ?'; params.push(payment_status); }
        if (search) { where += ' AND (inv.invoice_number LIKE ? OR cl.name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

        const [rows] = await pool.query(
            `SELECT inv.*, cl.name as client_name, co.name as company_name, u.first_name as created_by_name
             FROM invoices inv
             JOIN clients cl ON inv.client_id = cl.id
             LEFT JOIN companies co ON inv.company_id = co.id
             LEFT JOIN users u ON inv.created_by = u.id
             WHERE ${where} ORDER BY inv.created_at DESC LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );
        const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM invoices inv JOIN clients cl ON inv.client_id = cl.id WHERE ${where}`, params);
        res.json({ success: true, data: rows, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
    } catch (error) {
        console.error('Get invoices error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch invoices' });
    }
};

const getInvoiceById = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT inv.*, cl.name as client_name, cl.email as client_email, cl.address as client_address
             FROM invoices inv JOIN clients cl ON inv.client_id = cl.id WHERE inv.id = ?`,
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Invoice not found' });
        const [items] = await pool.query('SELECT * FROM invoice_items WHERE invoice_id = ?', [req.params.id]);
        res.json({ success: true, data: { ...rows[0], items } });
    } catch (error) {
        console.error('Get invoice error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch invoice' });
    }
};

const createInvoice = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const { invoice_number, client_id, company_id, issue_date, due_date, subtotal, tax_amount, total_amount, notes, items } = req.body;
        const toNull = (v) => (v === undefined ? null : v);
        const [result] = await conn.query(
            `INSERT INTO invoices (invoice_number, client_id, company_id, issue_date, due_date, subtotal, tax_amount, total_amount, notes, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [toNull(invoice_number), toNull(client_id), toNull(company_id), toNull(issue_date), toNull(due_date), toNull(subtotal), toNull(tax_amount) || 0, toNull(total_amount), toNull(notes), toNull(req.user?.id)]
        );
        if (items && items.length > 0) {
            for (const item of items) {
                await conn.query(
                    'INSERT INTO invoice_items (invoice_id, description, quantity, rate, amount) VALUES (?, ?, ?, ?, ?)',
                    [result.insertId, toNull(item.description), toNull(item.quantity) || 1, toNull(item.rate), toNull(item.amount)]
                );
            }
        }
        const [rows] = await conn.query('SELECT * FROM invoices WHERE id = ?', [result.insertId]);
        const [invoiceItems] = await conn.query('SELECT * FROM invoice_items WHERE invoice_id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: { ...rows[0], items: invoiceItems } });
    } catch (error) {
        console.error('Create invoice error:', error);
        res.status(500).json({ success: false, message: 'Failed to create invoice' });
    } finally {
        conn.release();
    }
};

const updateInvoice = async (req, res) => {
    try {
        const { payment_status, payment_date, notes } = req.body;
        const toNull = (v) => (v === undefined ? null : v);
        await pool.query(
            'UPDATE invoices SET payment_status=?, payment_date=?, notes=? WHERE id=?',
            [toNull(payment_status), toNull(payment_date), toNull(notes), req.params.id]
        );
        const [rows] = await pool.query('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Update invoice error:', error);
        res.status(500).json({ success: false, message: 'Failed to update invoice' });
    }
};

const deleteInvoice = async (req, res) => {
    try {
        await pool.query('DELETE FROM invoices WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Invoice deleted' });
    } catch (error) {
        console.error('Delete invoice error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete invoice' });
    }
};

// ---- EXPENSES ----

const getExpenses = async (req, res) => {
    try {
        const { category, start_date, end_date, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let where = '1=1';
        const params = [];
        if (category) { where += ' AND ex.category = ?'; params.push(category); }
        if (start_date) { where += ' AND ex.expense_date >= ?'; params.push(start_date); }
        if (end_date) { where += ' AND ex.expense_date <= ?'; params.push(end_date); }

        const [rows] = await pool.query(
            `SELECT ex.*, u.first_name as created_by_name
             FROM expenses ex LEFT JOIN users u ON ex.created_by = u.id
             WHERE ${where} ORDER BY ex.expense_date DESC LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );
        const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM expenses ex WHERE ${where}`, params);
        res.json({ success: true, data: rows, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
    } catch (error) {
        console.error('Get expenses error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch expenses' });
    }
};

const createExpense = async (req, res) => {
    try {
        const { category, description, amount, expense_date, receipt_url, payment_mode } = req.body;
        const toNull = (v) => (v === undefined ? null : v);
        const [result] = await pool.query(
            'INSERT INTO expenses (category, description, amount, expense_date, receipt_url, payment_mode, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [toNull(category), toNull(description), toNull(amount), toNull(expense_date), toNull(receipt_url), payment_mode || 'cash', req.user.id]
        );
        const [rows] = await pool.query('SELECT * FROM expenses WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Create expense error:', error);
        res.status(500).json({ success: false, message: 'Failed to create expense' });
    }
};

const updateExpense = async (req, res) => {
    try {
        const { category, description, amount, expense_date, receipt_url, payment_mode } = req.body;
        const toNull = (v) => (v === undefined ? null : v);
        await pool.query(
            'UPDATE expenses SET category=?, description=?, amount=?, expense_date=?, receipt_url=?, payment_mode=? WHERE id=?',
            [toNull(category), toNull(description), toNull(amount), toNull(expense_date), toNull(receipt_url), toNull(payment_mode), req.params.id]
        );
        const [rows] = await pool.query('SELECT * FROM expenses WHERE id = ?', [req.params.id]);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Update expense error:', error);
        res.status(500).json({ success: false, message: 'Failed to update expense' });
    }
};

const deleteExpense = async (req, res) => {
    try {
        await pool.query('DELETE FROM expenses WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Expense deleted' });
    } catch (error) {
        console.error('Delete expense error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete expense' });
    }
};

// ---- PROFIT/LOSS SUMMARY ----

const getProfitLoss = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        let dateFilter = '';
        const incomeParams = [];
        const expenseParams = [];

        if (start_date && end_date) {
            dateFilter = ' AND issue_date BETWEEN ? AND ?';
            incomeParams.push(start_date, end_date);
            expenseParams.push(start_date, end_date);
        }

        const [[{ totalIncome }]] = await pool.query(
            `SELECT COALESCE(SUM(total_amount), 0) as totalIncome FROM invoices WHERE payment_status = 'paid'${dateFilter.replace('issue_date', 'payment_date')}`,
            incomeParams
        );
        const [[{ totalExpenses }]] = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as totalExpenses FROM expenses WHERE 1=1${dateFilter.replace('issue_date', 'expense_date')}`,
            expenseParams
        );

        const [monthlyIncome] = await pool.query(
            `SELECT DATE_FORMAT(payment_date, '%Y-%m') as month, SUM(total_amount) as amount
             FROM invoices WHERE payment_status = 'paid' GROUP BY month ORDER BY month DESC LIMIT 12`
        );
        const [monthlyExpenses] = await pool.query(
            `SELECT DATE_FORMAT(expense_date, '%Y-%m') as month, SUM(amount) as amount
             FROM expenses GROUP BY month ORDER BY month DESC LIMIT 12`
        );

        res.json({
            success: true,
            data: {
                totalIncome: parseFloat(totalIncome),
                totalExpenses: parseFloat(totalExpenses),
                netProfit: parseFloat(totalIncome) - parseFloat(totalExpenses),
                monthlyIncome,
                monthlyExpenses
            }
        });
    } catch (error) {
        console.error('Profit/Loss error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch profit/loss data' });
    }
};

module.exports = {
    getInvoices, getInvoiceById, createInvoice, updateInvoice, deleteInvoice,
    getExpenses, createExpense, updateExpense, deleteExpense,
    getProfitLoss
};
