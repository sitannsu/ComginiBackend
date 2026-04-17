const pool = require('../config/database');

// ---- EMPLOYEES ----

const getEmployees = async (req, res) => {
    try {
        const { status, department, search, page = 1, limit = 10 } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const offset = (pageNum - 1) * limitNum;
        let where = '1=1';
        const params = [];
        if (status) { where += ' AND e.status = ?'; params.push(status); }
        if (department) { where += ' AND e.department = ?'; params.push(department); }
        if (search) { where += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR e.employee_code LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

        const [rows] = await pool.query(
            `SELECT e.*, u.first_name, u.last_name, u.email, u.phone
             FROM employees e LEFT JOIN users u ON e.user_id = u.id
             WHERE ${where} ORDER BY u.first_name
             LIMIT ? OFFSET ?`,
            [...params, limitNum, offset]
        );
        res.json({
            success: true,
            data: rows.map((r) => ({
                id: `emp_${r.id}`,
                name: [r.first_name, r.last_name].filter(Boolean).join(' ').trim(),
                jobTitle: r.designation || null
            }))
        });
    } catch (error) {
        console.error('Get employees error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch employees' });
    }
};

const getEmployeeById = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT e.*, u.first_name, u.last_name, u.email, u.phone
             FROM employees e LEFT JOIN users u ON e.user_id = u.id WHERE e.id = ?`,
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Employee not found' });
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Get employee error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch employee' });
    }
};

const createEmployee = async (req, res) => {
    try {
        const { user_id, employee_code, department, designation, date_of_joining, salary, bank_account, ifsc_code, pan, aadhar, emergency_contact } = req.body;
        const [result] = await pool.query(
            `INSERT INTO employees (user_id, employee_code, department, designation, date_of_joining, salary, bank_account, ifsc_code, pan, aadhar, emergency_contact)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [user_id, employee_code, department, designation, date_of_joining, salary, bank_account, ifsc_code, pan, aadhar, emergency_contact]
        );
        const [rows] = await pool.query('SELECT e.*, u.first_name, u.last_name FROM employees e LEFT JOIN users u ON e.user_id = u.id WHERE e.id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        if (error && error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'Employee already exists for this user' });
        }
        console.error('Create employee error:', error);
        res.status(500).json({ success: false, message: 'Failed to create employee' });
    }
};

const updateEmployee = async (req, res) => {
    try {
        const { employee_code, department, designation, date_of_joining, date_of_leaving, salary, bank_account, ifsc_code, pan, aadhar, emergency_contact, status } = req.body;
        await pool.query(
            `UPDATE employees SET employee_code=?, department=?, designation=?, date_of_joining=?, date_of_leaving=?, salary=?, bank_account=?, ifsc_code=?, pan=?, aadhar=?, emergency_contact=?, status=? WHERE id=?`,
            [employee_code, department, designation, date_of_joining, date_of_leaving, salary, bank_account, ifsc_code, pan, aadhar, emergency_contact, status, req.params.id]
        );
        const [rows] = await pool.query('SELECT * FROM employees WHERE id = ?', [req.params.id]);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Update employee error:', error);
        res.status(500).json({ success: false, message: 'Failed to update employee' });
    }
};

// ---- ATTENDANCE ----

const getAttendance = async (req, res) => {
    try {
        const { employee_id, date, month, year } = req.query;
        let where = '1=1';
        const params = [];
        if (employee_id) { where += ' AND a.employee_id = ?'; params.push(employee_id); }
        if (date) { where += ' AND a.date = ?'; params.push(date); }
        if (month && year) { where += ' AND MONTH(a.date) = ? AND YEAR(a.date) = ?'; params.push(month, year); }

        const [rows] = await pool.query(
            `SELECT a.*, u.first_name, u.last_name
             FROM attendance a JOIN employees e ON a.employee_id = e.id LEFT JOIN users u ON e.user_id = u.id
             WHERE ${where} ORDER BY a.date DESC`,
            params
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get attendance error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch attendance' });
    }
};

const clockIn = async (req, res) => {
    try {
        let empId;
        if (req.body.employee_id) {
            empId = req.body.employee_id;
        } else {
            const [empRows] = await pool.query('SELECT id FROM employees WHERE user_id = ?', [req.user.id]);
            if (empRows.length === 0) return res.status(404).json({ success: false, message: 'Employee record not found' });
            empId = empRows[0].id;
        }

        const today = new Date().toISOString().split('T')[0];
        const [existing] = await pool.query('SELECT * FROM attendance WHERE employee_id = ? AND date = ?', [empId, today]);
        if (existing.length > 0) return res.status(400).json({ success: false, message: 'Already clocked in today' });

        const [result] = await pool.query(
            'INSERT INTO attendance (employee_id, date, in_time, status) VALUES (?, ?, NOW(), "present")',
            [empId, today]
        );
        const [rows] = await pool.query('SELECT * FROM attendance WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Clock in error:', error);
        res.status(500).json({ success: false, message: 'Failed to clock in' });
    }
};

const clockOut = async (req, res) => {
    try {
        let empId;
        if (req.body.employee_id) {
            empId = req.body.employee_id;
        } else {
            const [empRows] = await pool.query('SELECT id FROM employees WHERE user_id = ?', [req.user.id]);
            if (empRows.length === 0) return res.status(404).json({ success: false, message: 'Employee record not found' });
            empId = empRows[0].id;
        }

        const today = new Date().toISOString().split('T')[0];
        await pool.query(
            `UPDATE attendance SET out_time = NOW(), working_hours = TIMESTAMPDIFF(MINUTE, in_time, NOW()) / 60
             WHERE employee_id = ? AND date = ? AND out_time IS NULL`,
            [empId, today]
        );
        const [rows] = await pool.query('SELECT * FROM attendance WHERE employee_id = ? AND date = ?', [empId, today]);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Clock out error:', error);
        res.status(500).json({ success: false, message: 'Failed to clock out' });
    }
};

// ---- LEAVES ----

const getLeaves = async (req, res) => {
    try {
        const { employee_id, status, leave_type } = req.query;
        let where = '1=1';
        const params = [];
        if (employee_id) { where += ' AND l.employee_id = ?'; params.push(employee_id); }
        if (status) { where += ' AND l.status = ?'; params.push(status); }
        if (leave_type) { where += ' AND l.leave_type = ?'; params.push(leave_type); }

        const [rows] = await pool.query(
            `SELECT l.*, u.first_name, u.last_name, ua.first_name as approved_by_name
             FROM leaves l
             JOIN employees e ON l.employee_id = e.id
             LEFT JOIN users u ON e.user_id = u.id
             LEFT JOIN users ua ON l.approved_by = ua.id
             WHERE ${where} ORDER BY l.created_at DESC`,
            params
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get leaves error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch leaves' });
    }
};

const applyLeave = async (req, res) => {
    try {
        const { leave_type, start_date, end_date, total_days, reason } = req.body;
        const [empRows] = await pool.query('SELECT id FROM employees WHERE user_id = ?', [req.user.id]);
        if (empRows.length === 0) return res.status(404).json({ success: false, message: 'Employee record not found' });

        let calculatedDays = total_days;
        if (!calculatedDays && start_date && end_date) {
            const start = new Date(start_date);
            const end = new Date(end_date);
            calculatedDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        }

        const [result] = await pool.query(
            'INSERT INTO leaves (employee_id, leave_type, start_date, end_date, total_days, reason) VALUES (?, ?, ?, ?, ?, ?)',
            [empRows[0].id, leave_type, start_date, end_date, calculatedDays || 0, reason]
        );
        const [rows] = await pool.query('SELECT * FROM leaves WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Apply leave error:', error);
        res.status(500).json({ success: false, message: 'Failed to apply leave' });
    }
};

const approveLeave = async (req, res) => {
    try {
        const { status } = req.body;
        await pool.query(
            'UPDATE leaves SET status = ?, approved_by = ? WHERE id = ?',
            [status, req.user.id, req.params.id]
        );
        const [rows] = await pool.query('SELECT * FROM leaves WHERE id = ?', [req.params.id]);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Approve leave error:', error);
        res.status(500).json({ success: false, message: 'Failed to update leave status' });
    }
};

// ---- SALARY ----
const getSalary = async (req, res) => {
    try {
        const { employee_id, financial_year } = req.query;
        let where = '1=1';
        const params = [];
        if (employee_id) { where += ' AND sd.employee_id = ?'; params.push(employee_id); }
        if (financial_year) { where += ' AND sd.financial_year = ?'; params.push(financial_year); }
        const [rows] = await pool.query(
            `SELECT sd.*, u.first_name, u.last_name
             FROM salary_details sd
             JOIN employees e ON sd.employee_id = e.id
             LEFT JOIN users u ON e.user_id = u.id
             WHERE ${where}
             ORDER BY sd.updated_at DESC`,
            params
        );
        res.json({ success: true, message: 'Success', data: rows });
    } catch (error) {
        console.error('Get salary error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch salary' });
    }
};

const createSalary = async (req, res) => {
    try {
        const { employee_id, salary_in_hand, overtime_per_day, leave_deduction, paid_leave, financial_year } = req.body;
        const [result] = await pool.query(
            `INSERT INTO salary_details (employee_id, salary_in_hand, overtime_per_day, leave_deduction, paid_leave, financial_year)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [employee_id, salary_in_hand, overtime_per_day, leave_deduction, paid_leave || 0, financial_year]
        );
        const [rows] = await pool.query('SELECT * FROM salary_details WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, message: 'Success', data: rows[0] });
    } catch (error) {
        console.error('Create salary error:', error);
        res.status(500).json({ success: false, message: 'Failed to create salary' });
    }
};

const saveSalary = async (req, res) => {
    try {
        const { employees = [], year } = req.body;
        if (!Array.isArray(employees) || employees.length === 0 || !year) {
            return res.status(400).json({ success: false, message: 'employees and year are required' });
        }

        for (const emp of employees) {
            const employeeId = String(emp.employeeId || '').replace('emp_', '');
            if (!employeeId) continue;
            await pool.query(
                `INSERT INTO salary_details
                (employee_id, salary_in_hand, overtime_per_day, leave_deduction, paid_leave, financial_year)
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    parseInt(employeeId, 10),
                    emp.salaryPerMonth || 0,
                    emp.overtimePerDay || 0,
                    emp.leaveDeduction || 0,
                    emp.paidLeave || 0,
                    year
                ]
            );
        }

        res.json({ success: true, message: 'Salary saved' });
    } catch (error) {
        console.error('saveSalary error:', error);
        res.status(500).json({ success: false, message: 'Failed to save salary' });
    }
};

const deleteSalary = async (req, res) => {
    try {
        await pool.query('DELETE FROM salary_details WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Success', data: [] });
    } catch (error) {
        console.error('Delete salary error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete salary' });
    }
};

module.exports = {
    getEmployees, getEmployeeById, createEmployee, updateEmployee,
    getAttendance, clockIn, clockOut,
    getLeaves, applyLeave, approveLeave,
    getSalary, createSalary, saveSalary, deleteSalary
};
