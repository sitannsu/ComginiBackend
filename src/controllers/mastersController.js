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
/** Optional: parse d/m/y or dd/mm/yyyy to YYYY-MM-DD; pass through ISO yyyy-mm-dd */
function normalizeIncorporationDate(val) {
    if (val === undefined || val === null || val === '') return null;
    if (typeof val !== 'string') return toNull(val);
    const s = val.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
        const d = m[1].padStart(2, '0');
        const mo = m[2].padStart(2, '0');
        const y = m[3];
        return `${y}-${mo}-${d}`;
    }
    return s || null;
}

const createShareholder = async (req, res) => {
    try {
        const {
            company_id,
            full_name,
            shareholderName,
            name,
            father_name,
            fatherName,
            category,
            sub_category,
            subCategory,
            under_sub_category,
            underSubCategory,
            cin_llpin,
            cinLlpin,
            registration_no,
            registrationNo,
            incorporation_date,
            incorporationDate,
            pan,
            email,
            mobile,
            address_line1,
            addressLine1,
            country,
            state,
            city,
            pincode,
            pinCode,
            aadhaar,
            nationality,
            marital_status,
            maritalStatus,
            spouse_name,
            spouseName,
            occupation,
            guardian_name,
            guardianName,
            documents
        } = req.body;

        const displayName = full_name ?? shareholderName ?? name;
        if (!displayName || !String(displayName).trim()) {
            return res.status(400).json({
                success: false,
                message: 'name (or full_name / shareholderName) is required — Name of Body Corporate'
            });
        }

        const uploadedFile =
            req.file ||
            (req.files?.panDocument?.[0]) ||
            (req.files?.pan?.[0]) ||
            (req.files?.file?.[0]);

        let documentsPayload = documents;
        if (uploadedFile) {
            const rel = `/uploads/shareholders/${uploadedFile.filename}`;
            const base =
                documentsPayload && typeof documentsPayload === 'object'
                    ? documentsPayload
                    : documentsPayload && typeof documentsPayload === 'string'
                      ? (() => {
                            try {
                                return JSON.parse(documentsPayload);
                            } catch (_) {
                                return {};
                            }
                        })()
                      : {};
            documentsPayload = {
                ...base,
                panDocumentPath: rel,
                panDocumentOriginalName: uploadedFile.originalname
            };
        }
        const documentsJson =
            documentsPayload === undefined || documentsPayload === null
                ? null
                : typeof documentsPayload === 'string'
                  ? documentsPayload
                  : JSON.stringify(documentsPayload);

        const [result] = await pool.query(
            `INSERT INTO shareholders
            (company_id, full_name, father_name, category, sub_category, under_sub_category, cin_llpin, registration_no, incorporation_date,
             pan, email, mobile, address_line1, country, state, city, pincode, aadhaar, nationality, marital_status, spouse_name,
             occupation, guardian_name, documents)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                toNull(company_id),
                String(displayName).trim(),
                toNull(father_name ?? fatherName),
                toNull(category),
                toNull(sub_category ?? subCategory),
                toNull(under_sub_category ?? underSubCategory),
                toNull(cin_llpin ?? cinLlpin),
                toNull(registration_no ?? registrationNo),
                normalizeIncorporationDate(incorporation_date ?? incorporationDate),
                toNull(pan),
                toNull(email),
                toNull(mobile),
                toNull(address_line1 ?? addressLine1),
                toNull(country),
                toNull(state),
                toNull(city),
                toNull(pincode !== undefined ? pincode : pinCode),
                toNull(aadhaar),
                toNull(nationality),
                toNull(marital_status ?? maritalStatus),
                toNull(spouse_name ?? spouseName),
                toNull(occupation),
                toNull(guardian_name ?? guardianName),
                documentsJson
            ]
        );
        const [rows] = await pool.query(
            `SELECT s.*, c.name AS company_name FROM shareholders s
             LEFT JOIN companies c ON s.company_id = c.id WHERE s.id = ?`,
            [result.insertId]
        );
        res.status(201).json({
            success: true,
            message: 'Shareholder created successfully',
            data: mapShareholderToApi(rows[0])
        });
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

/** Map DB row to Shareholder Master API shape (camelCase) */
function mapShareholderToApi(row) {
    if (!row) return null;
    let documents = row.documents;
    if (documents && typeof documents === 'string') {
        try {
            documents = JSON.parse(documents);
        } catch (_) {
            /* keep string */
        }
    }
    return {
        id: row.id,
        name: row.full_name,
        shareholderName: row.full_name,
        fatherName: row.father_name || null,
        category: row.category || null,
        subCategory: row.sub_category || null,
        underSubCategory: row.under_sub_category || null,
        companyId: row.company_id,
        companyName: row.company_name || null,
        cinLlpin: row.cin_llpin || null,
        registrationNo: row.registration_no || null,
        incorporationDate: row.incorporation_date,
        pan: row.pan || null,
        email: row.email || null,
        mobile: row.mobile || null,
        addressLine1: row.address_line1 || null,
        country: row.country || null,
        state: row.state || null,
        city: row.city || null,
        pincode: row.pincode || null,
        pinCode: row.pincode || null,
        aadhaar: row.aadhaar || null,
        nationality: row.nationality || null,
        maritalStatus: row.marital_status || null,
        spouseName: row.spouse_name || null,
        occupation: row.occupation || null,
        guardianName: row.guardian_name || null,
        documents,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

/**
 * GET /api/v1/shareholders — list with search, pagination, optional company filter (company-wise list)
 * Query: search, page, limit, company_id
 */
const listShareholders = async (req, res) => {
    try {
        const { search = '', company_id, page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const where = ['1=1'];
        const params = [];

        if (company_id) {
            where.push('s.company_id = ?');
            params.push(company_id);
        }
        const term = String(search).trim();
        if (term) {
            const t = `%${term}%`;
            where.push(
                '(s.full_name LIKE ? OR s.father_name LIKE ? OR s.category LIKE ? OR s.sub_category LIKE ? OR s.under_sub_category LIKE ? OR s.pan LIKE ? OR s.email LIKE ? OR s.mobile LIKE ?)'
            );
            params.push(t, t, t, t, t, t, t, t);
        }

        const whereSql = where.join(' AND ');
        const [rows] = await pool.query(
            `SELECT s.*, c.name AS company_name
             FROM shareholders s
             LEFT JOIN companies c ON s.company_id = c.id
             WHERE ${whereSql}
             ORDER BY s.full_name ASC
             LIMIT ? OFFSET ?`,
            [...params, parseInt(limit, 10), offset]
        );
        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM shareholders s WHERE ${whereSql}`,
            params
        );

        const data = rows.map((r) => mapShareholderToApi(r));
        res.json({
            success: true,
            message: 'Shareholders fetched successfully',
            data,
            pagination: {
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                total
            }
        });
    } catch (error) {
        console.error('List shareholders error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch shareholders', data: [] });
    }
};

const updateShareholder = async (req, res) => {
    try {
        const id = req.params.id;
        const {
            company_id,
            full_name,
            shareholderName,
            name,
            father_name,
            fatherName,
            category,
            sub_category,
            subCategory,
            under_sub_category,
            underSubCategory,
            cin_llpin,
            cinLlpin,
            registration_no,
            registrationNo,
            incorporation_date,
            incorporationDate,
            pan,
            email,
            mobile,
            address_line1,
            addressLine1,
            country,
            state,
            city,
            pincode,
            pinCode,
            aadhaar,
            nationality,
            marital_status,
            maritalStatus,
            spouse_name,
            spouseName,
            occupation,
            guardian_name,
            guardianName,
            documents
        } = req.body;

        const resolvedFullName = full_name ?? shareholderName ?? name;
        if (resolvedFullName !== undefined && !String(resolvedFullName).trim()) {
            return res.status(400).json({
                success: false,
                message: 'name (or full_name / shareholderName) cannot be empty'
            });
        }

        const [existing] = await pool.query('SELECT id FROM shareholders WHERE id = ?', [id]);
        if (!existing.length) {
            return res.status(404).json({ success: false, message: 'Shareholder not found' });
        }

        const [curRows] = await pool.query('SELECT * FROM shareholders WHERE id = ?', [id]);
        const cur = curRows[0];

        const uploadedFile =
            req.file ||
            (req.files?.panDocument?.[0]) ||
            (req.files?.pan?.[0]) ||
            (req.files?.file?.[0]);

        const parseDocumentsRow = (raw) => {
            if (!raw) return {};
            if (typeof raw === 'object') return { ...raw };
            try {
                const o = JSON.parse(raw);
                return typeof o === 'object' && o !== null ? o : {};
            } catch (_) {
                return {};
            }
        };

        let nextDocumentsStr;
        if (uploadedFile) {
            const base = parseDocumentsRow(cur.documents);
            let merged = { ...base };
            if (documents !== undefined && documents !== null) {
                if (typeof documents === 'object') merged = { ...merged, ...documents };
                else if (typeof documents === 'string') {
                    try {
                        merged = { ...merged, ...JSON.parse(documents) };
                    } catch (_) {
                        /* ignore */
                    }
                }
            }
            const rel = `/uploads/shareholders/${uploadedFile.filename}`;
            merged = {
                ...merged,
                panDocumentPath: rel,
                panDocumentOriginalName: uploadedFile.originalname
            };
            nextDocumentsStr = JSON.stringify(merged);
        } else if (documents !== undefined) {
            nextDocumentsStr =
                documents === null ? null : typeof documents === 'string' ? documents : JSON.stringify(documents);
        } else {
            nextDocumentsStr = cur.documents;
        }

        const next = {
            company_id: company_id !== undefined ? toNull(company_id) : cur.company_id,
            full_name:
                resolvedFullName !== undefined ? String(resolvedFullName).trim() : cur.full_name,
            father_name: father_name !== undefined ? toNull(father_name) : fatherName !== undefined ? toNull(fatherName) : cur.father_name,
            category: category !== undefined ? toNull(category) : cur.category,
            sub_category: sub_category !== undefined ? toNull(sub_category) : subCategory !== undefined ? toNull(subCategory) : cur.sub_category,
            under_sub_category:
                under_sub_category !== undefined
                    ? toNull(under_sub_category)
                    : underSubCategory !== undefined
                      ? toNull(underSubCategory)
                      : cur.under_sub_category,
            cin_llpin: cin_llpin !== undefined ? toNull(cin_llpin) : cinLlpin !== undefined ? toNull(cinLlpin) : cur.cin_llpin,
            registration_no: registration_no !== undefined ? toNull(registration_no) : registrationNo !== undefined ? toNull(registrationNo) : cur.registration_no,
            incorporation_date:
                incorporation_date !== undefined
                    ? normalizeIncorporationDate(incorporation_date)
                    : incorporationDate !== undefined
                      ? normalizeIncorporationDate(incorporationDate)
                      : cur.incorporation_date,
            pan: pan !== undefined ? toNull(pan) : cur.pan,
            email: email !== undefined ? toNull(email) : cur.email,
            mobile: mobile !== undefined ? toNull(mobile) : cur.mobile,
            address_line1: address_line1 !== undefined ? toNull(address_line1) : addressLine1 !== undefined ? toNull(addressLine1) : cur.address_line1,
            country: country !== undefined ? toNull(country) : cur.country,
            state: state !== undefined ? toNull(state) : cur.state,
            city: city !== undefined ? toNull(city) : cur.city,
            pincode:
                pincode !== undefined
                    ? toNull(pincode)
                    : pinCode !== undefined
                      ? toNull(pinCode)
                      : cur.pincode,
            aadhaar: aadhaar !== undefined ? toNull(aadhaar) : cur.aadhaar,
            nationality: nationality !== undefined ? toNull(nationality) : cur.nationality,
            marital_status: marital_status !== undefined ? toNull(marital_status) : maritalStatus !== undefined ? toNull(maritalStatus) : cur.marital_status,
            spouse_name: spouse_name !== undefined ? toNull(spouse_name) : spouseName !== undefined ? toNull(spouseName) : cur.spouse_name,
            occupation: occupation !== undefined ? toNull(occupation) : cur.occupation,
            guardian_name: guardian_name !== undefined ? toNull(guardian_name) : guardianName !== undefined ? toNull(guardianName) : cur.guardian_name,
            documents: nextDocumentsStr
        };

        await pool.query(
            `UPDATE shareholders SET
                company_id=?, full_name=?, father_name=?, category=?, sub_category=?, under_sub_category=?,
                cin_llpin=?, registration_no=?, incorporation_date=?, pan=?, email=?, mobile=?, address_line1=?,
                country=?, state=?, city=?, pincode=?, aadhaar=?, nationality=?, marital_status=?, spouse_name=?,
                occupation=?, guardian_name=?, documents=?
             WHERE id=?`,
            [
                next.company_id,
                next.full_name,
                next.father_name,
                next.category,
                next.sub_category,
                next.under_sub_category,
                next.cin_llpin,
                next.registration_no,
                next.incorporation_date,
                next.pan,
                next.email,
                next.mobile,
                next.address_line1,
                next.country,
                next.state,
                next.city,
                next.pincode,
                next.aadhaar,
                next.nationality,
                next.marital_status,
                next.spouse_name,
                next.occupation,
                next.guardian_name,
                next.documents,
                id
            ]
        );

        const [rows] = await pool.query(
            `SELECT s.*, c.name AS company_name FROM shareholders s
             LEFT JOIN companies c ON s.company_id = c.id WHERE s.id = ?`,
            [id]
        );
        res.json({
            success: true,
            message: '',
            data: mapShareholderToApi(rows[0])
        });
    } catch (error) {
        console.error('Update shareholder error:', error);
        res.status(500).json({ success: false, message: 'Failed to update shareholder' });
    }
};

const deleteShareholder = async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM shareholders WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Shareholder not found' });
        }
        res.json({ success: true, message: 'Shareholder deleted successfully', data: null });
    } catch (error) {
        console.error('Delete shareholder error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete shareholder' });
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

/** Map DB row to Debenture holder Master API shape (camelCase) */
function mapDebentureHolderToApi(row) {
    if (!row) return null;
    let documents = row.documents;
    if (documents && typeof documents === 'string') {
        try {
            documents = JSON.parse(documents);
        } catch (_) {
            /* keep string */
        }
    }
    return {
        id: row.id,
        name: row.full_name,
        debentureHolderName: row.full_name,
        fatherName: row.father_name || null,
        category: row.category || null,
        subCategory: row.sub_category || null,
        underSubCategory: row.under_sub_category || null,
        companyId: row.company_id,
        companyName: row.company_name || null,
        addressLine1: row.address_line1 || null,
        country: row.country || null,
        state: row.state || null,
        city: row.city || null,
        pincode: row.pincode || null,
        pinCode: row.pincode || null,
        gender: row.gender || null,
        pan: row.pan || null,
        dob: row.dob || null,
        aadhaar: row.aadhaar || null,
        nationality: row.nationality || null,
        voterId: row.voter_id || null,
        email: row.email || null,
        mobile: row.mobile || null,
        maritalStatus: row.marital_status || null,
        spouseName: row.spouse_name || null,
        occupation: row.occupation || null,
        guardianName: row.guardian_name || null,
        cinRegistrationNo: row.cin_registration_no || null,
        incorporationDate: row.incorporation_date || null,
        documents,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

/**
 * GET /api/v1/debenture-holders — list with search, pagination, optional company filter
 * Query: search, page, limit, company_id
 */
const getDebentureHolders = async (req, res) => {
    try {
        const { search = '', company_id, page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const where = ['1=1'];
        const params = [];

        if (company_id) {
            where.push('d.company_id = ?');
            params.push(company_id);
        }
        const term = String(search).trim();
        if (term) {
            const t = `%${term}%`;
            where.push(
                '(d.full_name LIKE ? OR d.father_name LIKE ? OR d.category LIKE ? OR d.sub_category LIKE ? OR d.under_sub_category LIKE ? OR d.pan LIKE ? OR d.email LIKE ? OR d.mobile LIKE ?)'
            );
            params.push(t, t, t, t, t, t, t, t);
        }

        const whereSql = where.join(' AND ');
        const [rows] = await pool.query(
            `SELECT d.*, c.name AS company_name
             FROM debenture_holders d
             LEFT JOIN companies c ON d.company_id = c.id
             WHERE ${whereSql}
             ORDER BY d.full_name ASC
             LIMIT ? OFFSET ?`,
            [...params, parseInt(limit, 10), offset]
        );
        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM debenture_holders d WHERE ${whereSql}`,
            params
        );

        const data = rows.map((r) => mapDebentureHolderToApi(r));
        res.json({
            success: true,
            message: '',
            data,
            pagination: {
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                total
            }
        });
    } catch (error) {
        console.error('Get debenture holders error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch debenture holders', data: [] });
    }
};

module.exports = {
    getCompanies, getCompanyById, createCompany, updateCompany, deleteCompany,
    getDirectors, createDirector, updateDirector,
    getRTAs, createRTA, updateRTA, deleteRTA, linkCompanyRTA,
    getPCSFirms, createPCSFirm, updatePCSFirm, deletePCSFirm,
    searchMCACompanies,
    createShareholder,
    getShareholders,
    listShareholders,
    updateShareholder,
    deleteShareholder,
    createDebentureHolder,
    getDebentureHolders
};
