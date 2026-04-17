const pool = require('../config/database');

const otpStore = new Map();

async function ensureContractTables() {
    await pool.query(
        `CREATE TABLE IF NOT EXISTS mca_director_credentials (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            din VARCHAR(20),
            contact VARCHAR(20),
            email VARCHAR(255),
            user_id VARCHAR(255),
            password VARCHAR(255),
            hint_q VARCHAR(255),
            hint_a VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`
    );
    await pool.query(
        `CREATE TABLE IF NOT EXISTS banker_pan_records (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            pan VARCHAR(20) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`
    );
}

const listDirectorsContract = async (req, res) => {
    try {
        await ensureContractTables();
        const [rows] = await pool.query(
            'SELECT id, name, din, email FROM mca_director_credentials ORDER BY id DESC'
        );
        res.json({
            success: true,
            data: rows.map((r) => ({
                id: `dir_${r.id}`,
                name: r.name,
                din: r.din,
                email: r.email
            }))
        });
    } catch (error) {
        console.error('listDirectorsContract:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch directors', data: [] });
    }
};

const createDirectorContract = async (req, res) => {
    try {
        await ensureContractTables();
        const { name, din, contact, email, userId, password, hintQ, hintA } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: 'name is required' });
        }

        await pool.query(
            `INSERT INTO mca_director_credentials
            (name, din, contact, email, user_id, password, hint_q, hint_a)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, din || null, contact || null, email || null, userId || null, password || null, hintQ || null, hintA || null]
        );

        res.status(201).json({ success: true, message: 'Director added' });
    } catch (error) {
        console.error('createDirectorContract:', error);
        res.status(500).json({ success: false, message: 'Failed to add director' });
    }
};

const deleteDirectorContract = async (req, res) => {
    try {
        await ensureContractTables();
        const id = String(req.params.id || '').replace('dir_', '');
        await pool.query('DELETE FROM mca_director_credentials WHERE id = ?', [id]);
        res.json({ success: true, message: 'Deleted' });
    } catch (error) {
        console.error('deleteDirectorContract:', error);
        res.status(500).json({ success: false, message: 'Failed to delete director' });
    }
};

const listBankerPan = async (req, res) => {
    try {
        await ensureContractTables();
        const [rows] = await pool.query('SELECT id, name, pan FROM banker_pan_records ORDER BY id DESC');
        res.json({
            success: true,
            data: rows.map((r) => ({ id: `pan_${r.id}`, name: r.name, pan: r.pan }))
        });
    } catch (error) {
        console.error('listBankerPan:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch banker PAN records', data: [] });
    }
};

const createBankerPan = async (req, res) => {
    try {
        await ensureContractTables();
        const { name, pan } = req.body;
        if (!name || !pan) {
            return res.status(400).json({ success: false, message: 'name and pan are required' });
        }
        await pool.query('INSERT INTO banker_pan_records (name, pan) VALUES (?, ?)', [name, String(pan).toUpperCase()]);
        res.status(201).json({ success: true, message: 'Saved' });
    } catch (error) {
        console.error('createBankerPan:', error);
        res.status(500).json({ success: false, message: 'Failed to save banker PAN' });
    }
};

const listDebenture = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, full_name, father_name, category, sub_category, pan, aadhaar, email, mobile, address_line1, dob
             FROM debenture_holders
             ORDER BY id DESC`
        );
        res.json({
            success: true,
            data: rows.map((r) => ({
                id: `deb_${r.id}`,
                fullName: r.full_name,
                fatherName: r.father_name,
                category: r.category,
                subCategory: r.sub_category,
                pan: r.pan,
                aadhaar: r.aadhaar,
                email: r.email,
                mobile: r.mobile,
                address: r.address_line1,
                dob: r.dob
            }))
        });
    } catch (error) {
        console.error('listDebenture:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.json({ success: true, data: [] });
        }
        res.status(500).json({ success: false, message: 'Failed to fetch debenture holders', data: [] });
    }
};

const createDebenture = async (req, res) => {
    try {
        const { fullName, fatherName, category, subCategory, pan, aadhaar, email, mobile, address, dob } = req.body;
        if (!fullName) {
            return res.status(400).json({ success: false, message: 'fullName is required' });
        }
        await pool.query(
            `INSERT INTO debenture_holders
            (full_name, father_name, category, sub_category, pan, aadhaar, email, mobile, address_line1, dob)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                fullName,
                fatherName || null,
                category || null,
                subCategory || null,
                pan || null,
                aadhaar || null,
                email || null,
                mobile || null,
                address || null,
                dob || null
            ]
        );
        res.status(201).json({ success: true, message: 'Debenture holder added' });
    } catch (error) {
        console.error('createDebenture:', error);
        res.status(500).json({ success: false, message: 'Failed to add debenture holder' });
    }
};

const uploadFile = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'file is required' });
    }
    const fileName = `${Date.now()}-${String(req.file.originalname || 'upload.bin').replace(/\s+/g, '-')}`;
    res.json({
        success: true,
        data: {
            url: `/uploads/${fileName}`
        }
    });
};

const sendMcaOtp = async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) {
        return res.status(400).json({ success: false, message: 'email is required' });
    }
    otpStore.set(email, { otp: '123456', expiresAt: Date.now() + 5 * 60 * 1000 });
    res.json({ success: true, message: 'OTP sent' });
};

const verifyMcaOtp = async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const otp = String(req.body.otp || '').trim();
    const stored = otpStore.get(email);
    if (!stored || stored.expiresAt < Date.now() || stored.otp !== otp) {
        return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
    otpStore.delete(email);
    res.json({ success: true, message: 'Verified' });
};

module.exports = {
    listDirectorsContract,
    createDirectorContract,
    deleteDirectorContract,
    listBankerPan,
    createBankerPan,
    listDebenture,
    createDebenture,
    uploadFile,
    sendMcaOtp,
    verifyMcaOtp
};
