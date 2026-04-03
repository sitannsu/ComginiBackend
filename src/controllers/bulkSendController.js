const pool = require('../config/database');
const transporter = require('../config/email');

function normalizeStringList(arr) {
    if (!Array.isArray(arr)) return [];
    return arr
        .map((x) => (typeof x === 'string' ? x.trim() : x && (x.email || x.phone || x.mobile || x.contact)))
        .filter(Boolean);
}

/** POST /api/v1/bulk/whatsapp/send */
const sendBulkWhatsapp = async (req, res) => {
    try {
        const { message, contacts } = req.body;
        const list = normalizeStringList(contacts);
        if (!message || !String(message).trim()) {
            return res.status(400).json({ success: false, message: 'message is required' });
        }
        if (!list.length) {
            return res.status(400).json({ success: false, message: 'contacts must be a non-empty array' });
        }

        const uid = req.user?.id || null;
        const [result] = await pool.query(
            `INSERT INTO bulk_whatsapp_campaigns (user_id, message, contacts_json, sent_count, failed_count, status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                uid,
                String(message).trim(),
                JSON.stringify(list),
                0,
                0,
                'queued'
            ]
        );

        res.status(201).json({
            success: true,
            message: '',
            data: {
                campaignId: result.insertId,
                queued: list.length,
                note: 'WhatsApp sending is not wired to a provider in this build; campaign stored as queued.'
            }
        });
    } catch (error) {
        console.error('sendBulkWhatsapp:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({ success: false, message: 'Run credentials_and_bulk_campaigns.sql' });
        }
        res.status(500).json({ success: false, message: 'Failed to queue WhatsApp campaign' });
    }
};

/** POST /api/v1/bulk/gmail/send */
const sendBulkGmail = async (req, res) => {
    try {
        const { subject, emails, body, html, message } = req.body;
        const list = normalizeStringList(emails);
        if (!subject || !String(subject).trim()) {
            return res.status(400).json({ success: false, message: 'subject is required' });
        }
        if (!list.length) {
            return res.status(400).json({ success: false, message: 'emails must be a non-empty array' });
        }

        const textBody = body || message || '';
        const uid = req.user?.id || null;
        let sent = 0;
        let failed = 0;

        if (transporter) {
            const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
            for (const to of list) {
                try {
                    await transporter.sendMail({
                        from,
                        to,
                        subject: String(subject).trim(),
                        text: textBody,
                        html: html || undefined
                    });
                    sent += 1;
                } catch (e) {
                    console.error('sendBulkGmail mail error:', e.message);
                    failed += 1;
                }
            }
        } else {
            failed = list.length;
        }

        const [result] = await pool.query(
            `INSERT INTO bulk_gmail_campaigns (user_id, subject, body, emails_json, sent_count, failed_count, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                uid,
                String(subject).trim(),
                textBody,
                JSON.stringify(list),
                sent,
                failed,
                transporter ? 'completed' : 'no_smtp'
            ]
        );

        res.status(201).json({
            success: true,
            message: transporter ? '' : 'SMTP not configured (EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD); campaign logged with failed count.',
            data: {
                campaignId: result.insertId,
                sent,
                failed,
                total: list.length
            }
        });
    } catch (error) {
        console.error('sendBulkGmail:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({ success: false, message: 'Run credentials_and_bulk_campaigns.sql' });
        }
        res.status(500).json({ success: false, message: 'Failed to send bulk Gmail' });
    }
};

/** GET /api/v1/bulk/whatsapp/campaigns */
const listWhatsappCampaigns = async (req, res) => {
    try {
        const { search = '', page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const where = ['1=1'];
        const params = [];
        const term = String(search).trim();
        if (term) {
            where.push('(message LIKE ?)');
            params.push(`%${term}%`);
        }
        const whereSql = where.join(' AND ');
        const [rows] = await pool.query(
            `SELECT c.*, u.email AS sent_by_email, CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,'')) AS sent_by_name
             FROM bulk_whatsapp_campaigns c
             LEFT JOIN users u ON c.user_id = u.id
             WHERE ${whereSql} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
            [...params, parseInt(limit, 10), offset]
        );
        const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM bulk_whatsapp_campaigns c WHERE ${whereSql}`, params);
        const data = rows.map((r) => {
            let contacts = r.contacts_json;
            if (typeof contacts === 'string') {
                try {
                    contacts = JSON.parse(contacts);
                } catch (_) {
                    contacts = [];
                }
            }
            const totalContacts = Array.isArray(contacts) ? contacts.length : 0;
            return {
                id: r.id,
                dateOfSending: r.created_at,
                sentBy: (r.sent_by_name || '').trim() || r.sent_by_email || String(r.user_id || ''),
                totalContacts,
                sent: r.sent_count,
                failed: r.failed_count,
                message: r.message,
                attachment: r.attachment_path,
                status: r.status
            };
        });
        res.json({ success: true, message: '', data, pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total } });
    } catch (error) {
        console.error('listWhatsappCampaigns:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({ success: false, message: 'Run credentials_and_bulk_campaigns.sql', data: [] });
        }
        res.status(500).json({ success: false, message: 'Failed to list campaigns', data: [] });
    }
};

/** GET /api/v1/bulk/gmail/campaigns */
const listGmailCampaigns = async (req, res) => {
    try {
        const { search = '', page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const where = ['1=1'];
        const params = [];
        const term = String(search).trim();
        if (term) {
            where.push('(c.subject LIKE ? OR c.body LIKE ?)');
            params.push(`%${term}%`, `%${term}%`);
        }
        const whereSql = where.join(' AND ');
        const [rows] = await pool.query(
            `SELECT c.*, u.email AS sent_by_email, CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,'')) AS sent_by_name
             FROM bulk_gmail_campaigns c
             LEFT JOIN users u ON c.user_id = u.id
             WHERE ${whereSql} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
            [...params, parseInt(limit, 10), offset]
        );
        const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM bulk_gmail_campaigns c WHERE ${whereSql}`, params);
        const data = rows.map((r) => {
            let emails = r.emails_json;
            if (typeof emails === 'string') {
                try {
                    emails = JSON.parse(emails);
                } catch (_) {
                    emails = [];
                }
            }
            return {
                id: r.id,
                dateOfSending: r.created_at,
                sentBy: (r.sent_by_name || '').trim() || r.sent_by_email || String(r.user_id || ''),
                totalContacts: Array.isArray(emails) ? emails.length : 0,
                sent: r.sent_count,
                failed: r.failed_count,
                subject: r.subject,
                message: r.body,
                attachment: r.attachment_path,
                status: r.status
            };
        });
        res.json({ success: true, message: '', data, pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total } });
    } catch (error) {
        console.error('listGmailCampaigns:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(503).json({ success: false, message: 'Run credentials_and_bulk_campaigns.sql', data: [] });
        }
        res.status(500).json({ success: false, message: 'Failed to list campaigns', data: [] });
    }
};

/** Parse CSV / plain text / pasted Excel-exported text for phone numbers */
function extractPhonesFromBuffer(buf) {
    const text = buf.toString('utf8');
    const parts = text.split(/[\s,;\n\r\t]+/).map((s) => s.trim()).filter(Boolean);
    const seen = new Set();
    const out = [];
    for (const raw of parts) {
        const d = raw.replace(/\D/g, '');
        if (d.length < 8) continue;
        const normalized = d.length >= 10 ? d.slice(-10) : d;
        if (seen.has(normalized)) continue;
        seen.add(normalized);
        out.push(normalized);
    }
    return out;
}

/** POST /api/v1/bulk/whatsapp/upload — multipart field `file` */
const uploadWhatsAppContacts = async (req, res) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({
                success: false,
                message: 'file is required (multipart form-data, field name: file)'
            });
        }
        const contacts = extractPhonesFromBuffer(req.file.buffer);
        res.json({
            success: true,
            message: '',
            data: { contacts, count: contacts.length }
        });
    } catch (error) {
        console.error('uploadWhatsAppContacts:', error);
        res.status(500).json({ success: false, message: 'Failed to parse file' });
    }
};

module.exports = {
    sendBulkWhatsapp,
    sendBulkGmail,
    listWhatsappCampaigns,
    listGmailCampaigns,
    uploadWhatsAppContacts
};
