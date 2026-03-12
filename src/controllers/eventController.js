const pool = require('../config/database');

const getEvents = async (req, res) => {
    try {
        const { start_date, end_date, event_type, company_id, page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let where = '1=1';
        const params = [];
        if (start_date) { where += ' AND e.start_datetime >= ?'; params.push(start_date); }
        if (end_date) { where += ' AND e.start_datetime <= ?'; params.push(end_date); }
        if (event_type) { where += ' AND e.event_type = ?'; params.push(event_type); }
        if (company_id) { where += ' AND e.company_id = ?'; params.push(company_id); }

        const [rows] = await pool.query(
            `SELECT e.*, u.first_name as created_by_name, co.name as company_name, cl.name as client_name
             FROM events e
             LEFT JOIN users u ON e.created_by = u.id
             LEFT JOIN companies co ON e.company_id = co.id
             LEFT JOIN clients cl ON e.client_id = cl.id
             WHERE ${where} ORDER BY e.start_datetime ASC LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get events error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch events' });
    }
};

const getEventById = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT e.*, u.first_name as created_by_name FROM events e LEFT JOIN users u ON e.created_by = u.id WHERE e.id = ?`,
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Event not found' });
        const [attendees] = await pool.query(
            `SELECT ea.*, u.first_name, u.last_name, u.email FROM event_attendees ea JOIN users u ON ea.user_id = u.id WHERE ea.event_id = ?`,
            [req.params.id]
        );
        res.json({ success: true, data: { ...rows[0], attendees } });
    } catch (error) {
        console.error('Get event error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch event' });
    }
};

const createEvent = async (req, res) => {
    try {
        const { title, description, event_type, start_datetime, end_datetime, location, is_all_day, company_id, client_id, attendee_ids } = req.body;

        if (!title || typeof title !== 'string' || title.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'title is required' });
        }
        if (!start_datetime) {
            return res.status(400).json({ success: false, message: 'start_datetime is required' });
        }

        // mysql2 does not allow `undefined` in bind parameters.
        const toNull = (v) => (v === undefined ? null : v);

        // Normalize incoming datetime. Accepts:
        // - "YYYY-MM-DD HH:mm:ss"
        // - "YYYY-MM-DDTHH:mm:ss(.sss)Z" (ISO)
        const normalizeMySqlDateTime = (value) => {
            if (value === undefined || value === null || value === '') return null;
            if (typeof value === 'string') {
                // If ISO string, convert to MySQL "YYYY-MM-DD HH:mm:ss" (UTC)
                const d = new Date(value);
                if (!Number.isNaN(d.getTime())) {
                    const pad = (n) => String(n).padStart(2, '0');
                    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
                }
                // Otherwise, assume already in acceptable MySQL format
                return value;
            }
            if (value instanceof Date && !Number.isNaN(value.getTime())) {
                const pad = (n) => String(n).padStart(2, '0');
                return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())} ${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}:${pad(value.getUTCSeconds())}`;
            }
            return value;
        };

        // Validate foreign keys to avoid 500s from FK constraints
        const resolveExistingIdOrNull = async (table, id) => {
            if (id === undefined || id === null || id === '') return null;
            const numericId = Number(id);
            if (!Number.isFinite(numericId)) return null;
            const [rows] = await pool.query(`SELECT id FROM ${table} WHERE id = ? LIMIT 1`, [numericId]);
            return rows.length ? numericId : null;
        };

        const resolvedCompanyId = await resolveExistingIdOrNull('companies', company_id);
        const resolvedClientId = await resolveExistingIdOrNull('clients', client_id);

        const [result] = await pool.query(
            `INSERT INTO events (title, description, event_type, start_datetime, end_datetime, location, is_all_day, company_id, client_id, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title.trim(),
                toNull(description),
                event_type || 'other',
                normalizeMySqlDateTime(start_datetime),
                normalizeMySqlDateTime(end_datetime),
                toNull(location),
                is_all_day || false,
                resolvedCompanyId,
                resolvedClientId,
                toNull(req.user?.id),
            ]
        );
        if (attendee_ids && attendee_ids.length > 0) {
            for (const userId of attendee_ids) {
                await pool.query('INSERT INTO event_attendees (event_id, user_id) VALUES (?, ?)', [result.insertId, userId]);
            }
        }
        const [rows] = await pool.query('SELECT * FROM events WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({ success: false, message: 'Failed to create event' });
    }
};

const updateEvent = async (req, res) => {
    try {
        const { title, description, event_type, start_datetime, end_datetime, location, is_all_day, company_id, client_id } = req.body;
        await pool.query(
            `UPDATE events SET title=?, description=?, event_type=?, start_datetime=?, end_datetime=?, location=?, is_all_day=?, company_id=?, client_id=? WHERE id=?`,
            [title, description, event_type, start_datetime, end_datetime, location, is_all_day, company_id, client_id, req.params.id]
        );
        const [rows] = await pool.query('SELECT * FROM events WHERE id = ?', [req.params.id]);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Update event error:', error);
        res.status(500).json({ success: false, message: 'Failed to update event' });
    }
};

const deleteEvent = async (req, res) => {
    try {
        await pool.query('DELETE FROM events WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Event deleted' });
    } catch (error) {
        console.error('Delete event error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete event' });
    }
};

const respondToEvent = async (req, res) => {
    try {
        const { status } = req.body;
        await pool.query(
            'UPDATE event_attendees SET status = ? WHERE event_id = ? AND user_id = ?',
            [status, req.params.eventId, req.user.id]
        );
        res.json({ success: true, message: 'Response recorded' });
    } catch (error) {
        console.error('Respond to event error:', error);
        res.status(500).json({ success: false, message: 'Failed to respond to event' });
    }
};

module.exports = { getEvents, getEventById, createEvent, updateEvent, deleteEvent, respondToEvent };
