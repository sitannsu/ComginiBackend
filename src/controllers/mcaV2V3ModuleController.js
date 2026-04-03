const pool = require('../config/database');
const bcrypt = require('bcryptjs');

function isValidPan(pan) {
    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(String(pan || '').trim().toUpperCase());
}

// ---- MCA V2 ----

const listTransactions = async (req, res) => {
    try {
        const {
            status,
            userId,
            dueDateFrom,
            dueDateTo,
            transactionDateFrom,
            transactionDateTo,
            paymentDateFrom,
            paymentDateTo,
            search,
            page = 1,
            limit = 10
        } = req.query;

        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const where = ['1=1'];
        const params = [];

        if (status) {
            where.push('t.status = ?');
            params.push(status);
        }
        if (userId) {
            where.push('t.mca_user_id = ?');
            params.push(userId);
        }
        if (dueDateFrom) {
            where.push('t.due_date >= ?');
            params.push(dueDateFrom);
        }
        if (dueDateTo) {
            where.push('t.due_date <= ?');
            params.push(dueDateTo);
        }
        if (transactionDateFrom) {
            where.push('t.transaction_date >= ?');
            params.push(transactionDateFrom);
        }
        if (transactionDateTo) {
            where.push('t.transaction_date <= ?');
            params.push(transactionDateTo);
        }
        if (paymentDateFrom) {
            where.push('t.payment_date >= ?');
            params.push(paymentDateFrom);
        }
        if (paymentDateTo) {
            where.push('t.payment_date <= ?');
            params.push(paymentDateTo);
        }
        if (search) {
            where.push('(t.srn LIKE ? OR t.description LIKE ?)');
            const t = `%${String(search).trim()}%`;
            params.push(t, t);
        }

        const whereSql = where.join(' AND ');
        const [rows] = await pool.query(
            `SELECT t.*, co.name AS company_name FROM mca_v2_transactions t
             LEFT JOIN companies co ON t.company_id = co.id
             WHERE ${whereSql} ORDER BY t.id DESC LIMIT ? OFFSET ?`,
            [...params, parseInt(limit, 10), offset]
        );
        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM mca_v2_transactions t WHERE ${whereSql}`,
            params
        );

        res.json({
            success: true,
            message: '',
            data: rows,
            pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total }
        });
    } catch (error) {
        console.error('listTransactions:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({
                success: false,
                message: 'Run dir3_mca_api_extensions.sql to create mca_v2_transactions'
            });
        }
        res.status(500).json({ success: false, message: 'Failed to list transactions' });
    }
};

const fetchTransactions = async (req, res) => {
    try {
        const { userId, fromDate, toDate } = req.body;
        if (!fromDate || !toDate) {
            return res.status(400).json({ success: false, message: 'fromDate and toDate are required (YYYY-MM-DD)' });
        }

        const [result] = await pool.query(
            `INSERT INTO mca_v2_transactions (mca_user_id, status, transaction_date, srn, description, metadata)
             VALUES (?, 'synced', CURDATE(), ?, ?, ?)`,
            [
                userId || null,
                `SYNC-${Date.now()}`,
                `Synced range ${fromDate} to ${toDate}`,
                JSON.stringify({ fromDate, toDate, userId, syncedAt: new Date().toISOString() })
            ]
        );

        res.status(201).json({
            success: true,
            message: ' ',
            data: { insertId: result.insertId, fromDate, toDate, userId: userId || null }
        });
    } catch (error) {
        console.error('fetchTransactions:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({
                success: false,
                message: 'Run dir3_mca_api_extensions.sql'
            });
        }
        res.status(500).json({ success: false, message: 'Failed to fetch/sync transactions' });
    }
};

const getSrnDetails = async (req, res) => {
    try {
        const { srn } = req.params;
        const [rows] = await pool.query(
            `SELECT t.*, co.name AS company_name FROM mca_v2_transactions t
             LEFT JOIN companies co ON t.company_id = co.id
             WHERE t.srn = ? LIMIT 1`,
            [srn]
        );
        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'SRN not found' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('getSrnDetails:', error);
        res.status(500).json({ success: false, message: 'Failed to get SRN details' });
    }
};

const exportTransactionsCsv = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, mca_user_id, status, due_date, transaction_date, payment_date, amount, srn, description, company_id, created_at
             FROM mca_v2_transactions ORDER BY id DESC LIMIT 10000`
        );
        const headers = [
            'id',
            'mca_user_id',
            'status',
            'due_date',
            'transaction_date',
            'payment_date',
            'amount',
            'srn',
            'description',
            'company_id',
            'created_at'
        ];
        const escape = (v) => {
            if (v === null || v === undefined) return '';
            const s = String(v);
            if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
            return s;
        };
        let csv = `${headers.join(',')}\n`;
        for (const r of rows) {
            csv += `${headers.map((h) => escape(r[h])).join(',')}\n`;
        }
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="mca-v2-transactions.csv"');
        res.send(csv);
    } catch (error) {
        console.error('exportTransactionsCsv:', error);
        res.status(500).json({ success: false, message: 'Export failed' });
    }
};

const listMcaUsers = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, email, first_name, last_name, phone
             FROM users WHERE is_active = 1 ORDER BY first_name ASC LIMIT 500`
        );
        const data = rows.map((u) => ({
            id: String(u.id),
            label: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
            email: u.email,
            firstName: u.first_name,
            lastName: u.last_name
        }));
        res.json({ success: true, data });
    } catch (error) {
        console.error('listMcaUsers:', error);
        res.status(500).json({ success: false, message: 'Failed to list MCA users' });
    }
};

// ---- MCA V3 ----

const createMcaV3Account = async (req, res) => {
    try {
        const {
            userCategory,
            firstName,
            lastName,
            pan,
            dob,
            address,
            email,
            mobile,
            username,
            password,
            confirmPassword
        } = req.body;

        const cat = String(userCategory || 'REGISTERED').toUpperCase();
        if (!['REGISTERED', 'BUSINESS'].includes(cat)) {
            return res.status(400).json({
                success: false,
                message: 'userCategory must be REGISTERED or BUSINESS'
            });
        }
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'username and password are required' });
        }
        if (
            confirmPassword !== undefined &&
            confirmPassword !== null &&
            String(confirmPassword) !== '' &&
            password !== confirmPassword
        ) {
            return res.status(400).json({ success: false, message: 'password and confirmPassword must match' });
        }
        if (!pan || !isValidPan(pan)) {
            return res.status(400).json({ success: false, message: 'Invalid or missing PAN (format AAAAA9999A)' });
        }

        const [existing] = await pool.query('SELECT id FROM mca_v3_accounts WHERE username = ?', [username]);
        if (existing.length) {
            return res.status(409).json({ success: false, message: 'Username already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            `INSERT INTO mca_v3_accounts
             (user_category, first_name, last_name, pan, dob, address, email, mobile, username, password_hash, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                cat,
                firstName || null,
                lastName || null,
                pan ? String(pan).toUpperCase() : null,
                dob || null,
                address || null,
                email || null,
                mobile || null,
                username,
                passwordHash,
                req.user?.id || null
            ]
        );

        const [rows] = await pool.query(
            'SELECT id, user_category, first_name, last_name, pan, dob, email, mobile, username, created_at FROM mca_v3_accounts WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json({ success: true, message: '', data: rows[0] });
    } catch (error) {
        console.error('createMcaV3Account:', error);
        if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
            return res.status(409).json({ success: false, message: 'Username already exists' });
        }
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({
                success: false,
                message: 'Run dir3_mca_api_extensions.sql to create mca_v3_accounts'
            });
        }
        res.status(500).json({ success: false, message: 'Failed to create MCA V3 account' });
    }
};

module.exports = {
    listTransactions,
    fetchTransactions,
    getSrnDetails,
    exportTransactionsCsv,
    listMcaUsers,
    createMcaV3Account
};
