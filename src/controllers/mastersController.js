const pool = require('../config/database');
const toNull = (v) => (v === undefined ? null : v);

// ---- COMPANIES ----

const getCompanies = async (req, res) => {
    try {
        const { type, search, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let where = '1=1';
        const params = [];
        if (type) { where += ' AND company_type = ?'; params.push(type); }
        if (search) { where += ' AND (name LIKE ? OR cin LIKE ? OR llpin LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
        const [rows] = await pool.query(`SELECT * FROM companies WHERE ${where} ORDER BY name LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);
        const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM companies WHERE ${where}`, params);
        res.json({ success: true, data: rows, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
    } catch (error) {
        console.error('Get companies error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch companies' });
    }
};

const getCompanyById = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM companies WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Company not found' });
        const [directors] = await pool.query('SELECT * FROM directors WHERE company_id = ? ORDER BY is_active DESC, name', [req.params.id]);
        res.json({ success: true, data: { ...rows[0], directors } });
    } catch (error) {
        console.error('Get company error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch company' });
    }
};

const createCompany = async (req, res) => {
    try {
        // Support both API + UI payload shapes (snake_case + camelCase)
        const {
            name,
            companyName,
            cin,
            llpin,
            cinOrLlpin,
            company_type,
            companyType,
            status,
            roc,
            registration_date,
            registrationDate,
            email,
            phone,
            address,
            authorized_capital,
            authorizedCapital,
            paid_up_capital,
            paidUpCapital,
        } = req.body;

        const resolvedName = (typeof name === 'string' ? name : companyName);
        if (!resolvedName || typeof resolvedName !== 'string' || resolvedName.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'name is required' });
        }

        // UI provides one field: cinOrLlpin
        const cinValue = cin !== undefined ? cin : cinOrLlpin;
        const llpinValue = llpin !== undefined ? llpin : null;
        const resolvedCompanyType = company_type || companyType || 'company';

        const [result] = await pool.query(
            `INSERT INTO companies (name, cin, llpin, company_type, status, roc, registration_date, email, phone, address, authorized_capital, paid_up_capital)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                resolvedName.trim(),
                toNull(cinValue),
                toNull(llpinValue),
                resolvedCompanyType,
                toNull(status),
                toNull(roc),
                toNull(registration_date !== undefined ? registration_date : registrationDate),
                toNull(email),
                toNull(phone),
                toNull(address),
                toNull(authorized_capital !== undefined ? authorized_capital : authorizedCapital),
                toNull(paid_up_capital !== undefined ? paid_up_capital : paidUpCapital),
            ]
        );
        const [rows] = await pool.query('SELECT * FROM companies WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Create company error:', error);
        res.status(500).json({ success: false, message: 'Failed to create company' });
    }
};

const updateCompany = async (req, res) => {
    try {
        const { name, cin, llpin, company_type, status, roc, registration_date, email, phone, address, authorized_capital, paid_up_capital } = req.body;
        await pool.query(
            `UPDATE companies SET name=?, cin=?, llpin=?, company_type=?, status=?, roc=?, registration_date=?, email=?, phone=?, address=?, authorized_capital=?, paid_up_capital=? WHERE id=?`,
            [name, cin, llpin, company_type, status, roc, registration_date, email, phone, address, authorized_capital, paid_up_capital, req.params.id]
        );
        const [rows] = await pool.query('SELECT * FROM companies WHERE id = ?', [req.params.id]);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Update company error:', error);
        res.status(500).json({ success: false, message: 'Failed to update company' });
    }
};

const deleteCompany = async (req, res) => {
    try {
        await pool.query('DELETE FROM companies WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Company deleted' });
    } catch (error) {
        console.error('Delete company error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete company' });
    }
};

// ---- DIRECTORS ----

const getDirectors = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT d.*, c.name as company_name FROM directors d JOIN companies c ON d.company_id = c.id WHERE d.company_id = ? ORDER BY d.is_active DESC, d.name`,
            [req.params.companyId]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get directors error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch directors' });
    }
};

const createDirector = async (req, res) => {
    try {
        const { din, name, designation, appointment_date, cessation_date, tenure_years } = req.body;
        const toNull = (v) => (v === undefined ? null : v);
        const [result] = await pool.query(
            `INSERT INTO directors (company_id, din, name, designation, appointment_date, cessation_date, tenure_years) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [toNull(req.params.companyId), toNull(din), name, toNull(designation), toNull(appointment_date), toNull(cessation_date), toNull(tenure_years)]
        );
        const [rows] = await pool.query('SELECT * FROM directors WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Create director error:', error);
        res.status(500).json({ success: false, message: 'Failed to create director' });
    }
};

const updateDirector = async (req, res) => {
    try {
        const { din, name, designation, appointment_date, cessation_date, tenure_years, is_active } = req.body;
        await pool.query(
            `UPDATE directors SET din=?, name=?, designation=?, appointment_date=?, cessation_date=?, tenure_years=?, is_active=? WHERE id=?`,
            [din, name, designation, appointment_date, cessation_date, tenure_years, is_active, req.params.id]
        );
        const [rows] = await pool.query('SELECT * FROM directors WHERE id = ?', [req.params.id]);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Update director error:', error);
        res.status(500).json({ success: false, message: 'Failed to update director' });
    }
};

// ---- RTA MASTERS ----

const getRTAs = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM rta_masters ORDER BY name');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get RTAs error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch RTAs' });
    }
};

const createRTA = async (req, res) => {
    try {
        const { name, address, contact_person, phone, email, isin_code } = req.body;
        const [result] = await pool.query(
            'INSERT INTO rta_masters (name, address, contact_person, phone, email, isin_code) VALUES (?, ?, ?, ?, ?, ?)',
            [name, address, contact_person, phone, email, isin_code]
        );
        const [rows] = await pool.query('SELECT * FROM rta_masters WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Create RTA error:', error);
        res.status(500).json({ success: false, message: 'Failed to create RTA' });
    }
};

const updateRTA = async (req, res) => {
    try {
        const { name, address, contact_person, phone, email, isin_code } = req.body;
        await pool.query(
            'UPDATE rta_masters SET name=?, address=?, contact_person=?, phone=?, email=?, isin_code=? WHERE id=?',
            [name, address, contact_person, phone, email, isin_code, req.params.id]
        );
        const [rows] = await pool.query('SELECT * FROM rta_masters WHERE id = ?', [req.params.id]);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Update RTA error:', error);
        res.status(500).json({ success: false, message: 'Failed to update RTA' });
    }
};

const deleteRTA = async (req, res) => {
    try {
        await pool.query('DELETE FROM rta_masters WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'RTA deleted' });
    } catch (error) {
        console.error('Delete RTA error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete RTA' });
    }
};

const linkCompanyRTA = async (req, res) => {
    try {
        const { company_id, rta_id } = req.body;
        const [result] = await pool.query('INSERT INTO company_rta (company_id, rta_id) VALUES (?, ?)', [company_id, rta_id]);
        res.status(201).json({ success: true, data: { id: result.insertId, company_id, rta_id } });
    } catch (error) {
        console.error('Link company RTA error:', error);
        res.status(500).json({ success: false, message: 'Failed to link company to RTA' });
    }
};

// ---- PCS/CA FIRMS ----

const getPCSFirms = async (req, res) => {
    try {
        const { type } = req.query;
        let where = '1=1';
        const params = [];
        if (type) { where += ' AND firm_type = ?'; params.push(type); }
        const [rows] = await pool.query(`SELECT * FROM pcs_firms WHERE ${where} ORDER BY firm_name`, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get PCS firms error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch PCS firms' });
    }
};

const createPCSFirm = async (req, res) => {
    try {
        const { firm_name, urn, address, gstin, pan, contact_person, phone, email, firm_type } = req.body;
        const [result] = await pool.query(
            'INSERT INTO pcs_firms (firm_name, urn, address, gstin, pan, contact_person, phone, email, firm_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [firm_name, urn, address, gstin, pan, contact_person, phone, email, firm_type || 'pcs']
        );
        const [rows] = await pool.query('SELECT * FROM pcs_firms WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Create PCS firm error:', error);
        res.status(500).json({ success: false, message: 'Failed to create PCS firm' });
    }
};

const updatePCSFirm = async (req, res) => {
    try {
        const { firm_name, urn, address, gstin, pan, contact_person, phone, email, firm_type } = req.body;
        await pool.query(
            'UPDATE pcs_firms SET firm_name=?, urn=?, address=?, gstin=?, pan=?, contact_person=?, phone=?, email=?, firm_type=? WHERE id=?',
            [firm_name, urn, address, gstin, pan, contact_person, phone, email, firm_type, req.params.id]
        );
        const [rows] = await pool.query('SELECT * FROM pcs_firms WHERE id = ?', [req.params.id]);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Update PCS firm error:', error);
        res.status(500).json({ success: false, message: 'Failed to update PCS firm' });
    }
};

const deletePCSFirm = async (req, res) => {
    try {
        await pool.query('DELETE FROM pcs_firms WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'PCS firm deleted' });
    } catch (error) {
        console.error('Delete PCS firm error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete PCS firm' });
    }
};

const searchMCACompanies = async (req, res) => {
    try {
        const { search = '', limit = 20 } = req.query;
        const term = `%${String(search).trim()}%`;
        const [rows] = await pool.query(
            `SELECT id, name as company_name, cin, llpin, company_type, status
             FROM companies
             WHERE (? = '%%' OR name LIKE ? OR cin LIKE ? OR llpin LIKE ?)
             ORDER BY name
             LIMIT ?`,
            [term, term, term, term, parseInt(limit, 10)]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Search MCA companies error:', error);
        res.status(500).json({ success: false, message: 'Failed to search MCA companies' });
    }
};

// ---- SHAREHOLDERS ----
const createShareholder = async (req, res) => {
    try {
        const {
            company_id, full_name, father_name, category, sub_category, under_sub_category,
            cin_llpin, registration_no, incorporation_date, pan, email, mobile, address_line1,
            country, state, city, pincode, aadhaar, nationality, marital_status, spouse_name,
            occupation, guardian_name, documents
        } = req.body;

        if (!full_name || !String(full_name).trim()) {
            return res.status(400).json({ success: false, message: 'full_name is required' });
        }

        const [result] = await pool.query(
            `INSERT INTO shareholders
            (company_id, full_name, father_name, category, sub_category, under_sub_category, cin_llpin, registration_no, incorporation_date,
             pan, email, mobile, address_line1, country, state, city, pincode, aadhaar, nationality, marital_status, spouse_name,
             occupation, guardian_name, documents)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                toNull(company_id), String(full_name).trim(), toNull(father_name), toNull(category), toNull(sub_category),
                toNull(under_sub_category), toNull(cin_llpin), toNull(registration_no), toNull(incorporation_date), toNull(pan),
                toNull(email), toNull(mobile), toNull(address_line1), toNull(country), toNull(state), toNull(city), toNull(pincode),
                toNull(aadhaar), toNull(nationality), toNull(marital_status), toNull(spouse_name), toNull(occupation),
                toNull(guardian_name), documents === undefined ? null : JSON.stringify(documents)
            ]
        );
        const [rows] = await pool.query('SELECT * FROM shareholders WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Create shareholder error:', error);
        res.status(500).json({ success: false, message: 'Failed to create shareholder' });
    }
};

const getShareholders = async (req, res) => {
    try {
        const { company_id, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const where = company_id ? 'WHERE s.company_id = ?' : '';
        const params = company_id ? [company_id] : [];
        const [rows] = await pool.query(
            `SELECT s.*, c.name as company_name
             FROM shareholders s
             LEFT JOIN companies c ON s.company_id = c.id
             ${where}
             ORDER BY s.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, parseInt(limit, 10), offset]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get shareholders error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch shareholders' });
    }
};

// ---- DEBENTURE HOLDERS ----
const createDebentureHolder = async (req, res) => {
    try {
        const {
            company_id, full_name, father_name, category, sub_category, under_sub_category,
            address_line1, country, state, city, pincode, gender, pan, dob, aadhaar, nationality,
            voter_id, email, mobile, marital_status, spouse_name, occupation, guardian_name,
            cin_registration_no, incorporation_date, documents
        } = req.body;

        if (!full_name || !String(full_name).trim()) {
            return res.status(400).json({ success: false, message: 'full_name is required' });
        }

        const [result] = await pool.query(
            `INSERT INTO debenture_holders
            (company_id, full_name, father_name, category, sub_category, under_sub_category, address_line1, country, state, city, pincode,
             gender, pan, dob, aadhaar, nationality, voter_id, email, mobile, marital_status, spouse_name, occupation, guardian_name,
             cin_registration_no, incorporation_date, documents)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                toNull(company_id), String(full_name).trim(), toNull(father_name), toNull(category), toNull(sub_category),
                toNull(under_sub_category), toNull(address_line1), toNull(country), toNull(state), toNull(city), toNull(pincode),
                toNull(gender), toNull(pan), toNull(dob), toNull(aadhaar), toNull(nationality), toNull(voter_id), toNull(email),
                toNull(mobile), toNull(marital_status), toNull(spouse_name), toNull(occupation), toNull(guardian_name),
                toNull(cin_registration_no), toNull(incorporation_date), documents === undefined ? null : JSON.stringify(documents)
            ]
        );
        const [rows] = await pool.query('SELECT * FROM debenture_holders WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Create debenture holder error:', error);
        res.status(500).json({ success: false, message: 'Failed to create debenture holder' });
    }
};

const getDebentureHolders = async (req, res) => {
    try {
        const { company_id, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const where = company_id ? 'WHERE d.company_id = ?' : '';
        const params = company_id ? [company_id] : [];
        const [rows] = await pool.query(
            `SELECT d.*, c.name as company_name
             FROM debenture_holders d
             LEFT JOIN companies c ON d.company_id = c.id
             ${where}
             ORDER BY d.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, parseInt(limit, 10), offset]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get debenture holders error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch debenture holders' });
    }
};

module.exports = {
    getCompanies, getCompanyById, createCompany, updateCompany, deleteCompany,
    getDirectors, createDirector, updateDirector,
    getRTAs, createRTA, updateRTA, deleteRTA, linkCompanyRTA,
    getPCSFirms, createPCSFirm, updatePCSFirm, deletePCSFirm,
    searchMCACompanies, createShareholder, getShareholders, createDebentureHolder, getDebentureHolders
};
