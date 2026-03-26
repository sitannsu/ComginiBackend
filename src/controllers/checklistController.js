const pool = require('../config/database');

const toNull = (v) => (v === undefined ? null : v);

const getChecklists = async (req, res) => {
    try {
        const { search, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let where = '1=1';
        const params = [];
        if (search) { 
            where += ' AND (title LIKE ?)'; 
            params.push(`%${search}%`); 
        }

        const [rows] = await pool.query(
            `SELECT c.*, u.first_name as created_by_name
             FROM checklists c
             LEFT JOIN users u ON c.created_by = u.id
             WHERE ${where} ORDER BY c.updated_at DESC LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );
        const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM checklists WHERE ${where}`, params);
        
        const mappedData = rows.map(row => ({
            id: row.id,
            title: row.title,
            createdBy: row.created_by_name || 'System',
            updatedAt: row.updated_at
        }));

        res.json({ success: true, message: 'Data fetched successfully', data: mappedData, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
    } catch (error) {
        console.error('Get checklists error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch checklists' });
    }
};

const createChecklist = async (req, res) => {
    try {
        const { title, items } = req.body;
        if (!title || typeof title !== 'string' || title.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'title is required' });
        }

        const [result] = await pool.query(
            'INSERT INTO checklists (title, created_by) VALUES (?, ?)',
            [title.trim(), req.user.id]
        );
        const checklistId = result.insertId;

        if (items && Array.isArray(items)) {
            for (const item of items) {
                await pool.query(
                    'INSERT INTO checklist_items (checklist_id, sr_no, particular) VALUES (?, ?, ?)',
                    [checklistId, toNull(item.srNo), item.particular]
                );
            }
        }

        const [rows] = await pool.query('SELECT * FROM checklists WHERE id = ?', [checklistId]);
        res.status(201).json({ success: true, message: 'Checklist created successfully', data: rows[0] });
    } catch (error) {
        console.error('Create checklist error:', error);
        res.status(500).json({ success: false, message: 'Failed to create checklist' });
    }
};

const deleteChecklist = async (req, res) => {
    try {
        await pool.query('DELETE FROM checklists WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Checklist deleted successfully' });
    } catch (error) {
        console.error('Delete checklist error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete checklist' });
    }
};

const importChecklistExcel = async (req, res) => {
    try {
        // Mocking excel import behavior as per user request
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        
        // In reality, would use 'xlsx' or similar to parse
        // For now, let's say it's successful
        res.status(200).json({ success: true, message: 'Checklist imported successfully from ' + req.file.originalname });
    } catch (error) {
        console.error('Import checklist error:', error);
        res.status(500).json({ success: false, message: 'Failed to import checklist' });
    }
};

module.exports = { getChecklists, createChecklist, deleteChecklist, importChecklistExcel };
