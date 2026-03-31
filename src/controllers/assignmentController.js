const pool = require('../config/database');

const getAssignments = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let where = '1=1';
        const params = [];
        if (status) { 
            where += ' AND ca.status = ?'; 
            params.push(status); 
        }

        const [rows] = await pool.query(
            `SELECT ca.*, 
                    c.name as company_name, 
                    ch.title as checklist_title, 
                    um.first_name as maker_name, 
                    uc.first_name as checker_name
             FROM checklist_assignments ca
             LEFT JOIN companies c ON ca.company_id = c.id
             LEFT JOIN checklists ch ON ca.checklist_id = ch.id
             LEFT JOIN users um ON ca.maker_id = um.id
             LEFT JOIN users uc ON ca.checker_id = uc.id
             WHERE ${where} ORDER BY ca.due_date DESC LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );
        const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM checklist_assignments ca WHERE ${where}`, params);
        
        const mappedData = rows.map(row => ({
            id: row.id,
            companyName: row.company_name,
            assignment: row.checklist_title,
            maker: row.maker_name,
            checker: row.checker_name,
            status: row.status.charAt(0).toUpperCase() + row.status.slice(1),
            dueDate: row.due_date
        }));

        res.json({ success: true, message: 'Assignments fetched successfully', data: mappedData, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
    } catch (error) {
        console.error('Get assignments error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch assignments' });
    }
};

const createAssignment = async (req, res) => {
    try {
        const companyId = req.body.company_id || req.body.companyId;
        const checklistId = req.body.checklist_id || req.body.checklistId;
        const makerId = req.body.maker_id || req.body.makerId;
        const checkerId = req.body.checker_id || req.body.checkerId;
        const dueDate = req.body.due_date || req.body.dueDate;

        if (!companyId || !checklistId || !makerId || !checkerId) {
            return res.status(400).json({ success: false, message: 'Required fields: company_id, checklist_id, maker_id, checker_id' });
        }

        const [result] = await pool.query(
            `INSERT INTO checklist_assignments (company_id, checklist_id, maker_id, checker_id, due_date)
             VALUES (?, ?, ?, ?, ?)`,
            [companyId, checklistId, makerId, checkerId, dueDate]
        );

        const [rows] = await pool.query('SELECT * FROM checklist_assignments WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, message: 'Checklist assigned successfully', data: rows[0] });
    } catch (error) {
        console.error('Assign checklist error:', error);
        res.status(500).json({ success: false, message: 'Failed to assign checklist' });
    }
};

const getUsers = async (req, res) => {
    try {
        const { role } = req.query; // role filter from frontend request: maker/checker
        let query = 'SELECT id, first_name as name, role FROM users WHERE is_active = true';
        const params = [];

        if (role === 'maker') {
            query += ' AND role IN ("employee", "manager", "admin")';
        } else if (role === 'checker') {
            query += ' AND role IN ("manager", "admin")';
        } else if (role) {
            query += ' AND role = ?';
            params.push(role);
        }

        const [rows] = await pool.query(query, params);
        res.json({ success: true, message: 'Data fetched successfully', data: rows });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
};

const getCompanies = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name FROM companies ORDER BY name');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get companies error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch companies' });
    }
};

module.exports = { getAssignments, createAssignment, getUsers, getCompanies };
