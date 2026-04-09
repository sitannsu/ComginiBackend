const pool = require('../config/database');

const toNull = (v) => (v === undefined ? null : v);

const sendDbError = (res, error, fallbackMessage) => {
    if (error.code === 'ER_NO_SUCH_TABLE' || error.errno === 1146) {
        return res.status(503).json({
            success: false,
            message: `${fallbackMessage} Database table missing. Run: mysql ... < src/database/deploy_modules_leads_finance_hr.sql`,
            code: 'MIGRATION_REQUIRED'
        });
    }
    return res.status(500).json({ success: false, message: fallbackMessage });
};

const mapRow = (row) => ({
    id: `pay_${row.id}`,
    invoice_id: row.invoice_number || (row.invoice_id != null ? String(row.invoice_id) : null),
    payment_date: row.payment_date,
    payment_method: row.payment_method,
    note: row.note,
    amount: row.amount != null ? parseFloat(row.amount) : 0,
    assignment_id: row.assignment_id
});

const resolveInvoiceId = async (raw) => {
    if (raw == null || raw === '') return null;
    const s = String(raw).trim();
    if (s.startsWith('inv_')) {
        const n = parseInt(s.slice(4), 10);
        return Number.isNaN(n) ? null : n;
    }
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    const [rows] = await pool.query('SELECT id FROM invoices WHERE invoice_number = ? LIMIT 1', [s]);
    return rows.length ? rows[0].id : null;
};

const getPayments = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            assignment_id,
            payment_method,
            month,
            year,
            search
        } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        let where = '1=1';
        const params = [];

        if (assignment_id) {
            where += ' AND p.assignment_id = ?';
            params.push(assignment_id);
        }
        if (payment_method) {
            where += ' AND p.payment_method = ?';
            params.push(payment_method);
        }
        if (year && month) {
            where += ' AND YEAR(p.payment_date) = ? AND MONTH(p.payment_date) = ?';
            params.push(parseInt(year, 10), parseInt(month, 10));
        } else if (year) {
            where += ' AND YEAR(p.payment_date) = ?';
            params.push(parseInt(year, 10));
        }
        if (search) {
            where += ' AND (inv.invoice_number LIKE ? OR p.note LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        const [rows] = await pool.query(
            `SELECT p.*, inv.invoice_number
             FROM payments p
             LEFT JOIN invoices inv ON p.invoice_id = inv.id
             WHERE ${where}
             ORDER BY p.payment_date DESC, p.id DESC
             LIMIT ? OFFSET ?`,
            [...params, parseInt(limit, 10), offset]
        );
        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) as total FROM payments p
             LEFT JOIN invoices inv ON p.invoice_id = inv.id
             WHERE ${where}`,
            params
        );

        res.json({
            success: true,
            data: {
                total,
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                payments: rows.map(mapRow)
            }
        });
    } catch (error) {
        console.error('Get payments error:', error);
        sendDbError(res, error, 'Failed to fetch payments');
    }
};

const createPayment = async (req, res) => {
    try {
        const { invoice_id, payment_date, payment_method, note, amount, assignment_id } = req.body;
        const invId = await resolveInvoiceId(invoice_id);
        const [result] = await pool.query(
            `INSERT INTO payments (invoice_id, assignment_id, payment_date, payment_method, note, amount, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                toNull(invId),
                toNull(assignment_id),
                toNull(payment_date),
                toNull(payment_method),
                toNull(note),
                toNull(amount),
                req.user?.id ?? null
            ]
        );
        const [rows] = await pool.query(
            `SELECT p.*, inv.invoice_number FROM payments p
             LEFT JOIN invoices inv ON p.invoice_id = inv.id WHERE p.id = ?`,
            [result.insertId]
        );
        res.status(201).json({
            success: true,
            message: 'Payment added successfully',
            data: mapRow(rows[0])
        });
    } catch (error) {
        console.error('Create payment error:', error);
        sendDbError(res, error, 'Failed to create payment');
    }
};

const updatePayment = async (req, res) => {
    try {
        const id = parseInt(String(req.params.id).replace(/^pay_/, ''), 10);
        const { invoice_id, payment_date, payment_method, note, amount, assignment_id } = req.body;
        const fields = [];
        const values = [];
        if (invoice_id !== undefined) {
            fields.push('invoice_id = ?');
            values.push(await resolveInvoiceId(invoice_id));
        }
        if (assignment_id !== undefined) {
            fields.push('assignment_id = ?');
            values.push(toNull(assignment_id));
        }
        if (payment_date !== undefined) {
            fields.push('payment_date = ?');
            values.push(toNull(payment_date));
        }
        if (payment_method !== undefined) {
            fields.push('payment_method = ?');
            values.push(toNull(payment_method));
        }
        if (note !== undefined) {
            fields.push('note = ?');
            values.push(toNull(note));
        }
        if (amount !== undefined) {
            fields.push('amount = ?');
            values.push(toNull(amount));
        }
        if (fields.length === 0) {
            const [rows] = await pool.query(
                `SELECT p.*, inv.invoice_number FROM payments p
                 LEFT JOIN invoices inv ON p.invoice_id = inv.id WHERE p.id = ?`,
                [id]
            );
            if (rows.length === 0) return res.status(404).json({ success: false, message: 'Payment not found' });
            return res.json({ success: true, message: 'Payment updated successfully', data: mapRow(rows[0]) });
        }
        values.push(id);
        await pool.query(`UPDATE payments SET ${fields.join(', ')} WHERE id = ?`, values);
        const [rows] = await pool.query(
            `SELECT p.*, inv.invoice_number FROM payments p
             LEFT JOIN invoices inv ON p.invoice_id = inv.id WHERE p.id = ?`,
            [id]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Payment not found' });
        res.json({ success: true, message: 'Payment updated successfully', data: mapRow(rows[0]) });
    } catch (error) {
        console.error('Update payment error:', error);
        sendDbError(res, error, 'Failed to update payment');
    }
};

const deletePayment = async (req, res) => {
    try {
        const id = parseInt(String(req.params.id).replace(/^pay_/, ''), 10);
        const [r] = await pool.query('DELETE FROM payments WHERE id = ?', [id]);
        if (r.affectedRows === 0) return res.status(404).json({ success: false, message: 'Payment not found' });
        res.json({ success: true, message: 'Payment deleted successfully' });
    } catch (error) {
        console.error('Delete payment error:', error);
        sendDbError(res, error, 'Failed to delete payment');
    }
};

module.exports = { getPayments, createPayment, updatePayment, deletePayment };
