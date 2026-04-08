const pool = require('../config/database');

const getRegistrations = async (req, res) => {
    try {
        const { company_id, status, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let where = '1=1';
        const params = [];
        if (company_id) { where += ' AND rl.company_id = ?'; params.push(company_id); }
        if (status) { where += ' AND rl.status = ?'; params.push(status); }

        const [rows] = await pool.query(
            `SELECT rl.*, co.name as company_name
             FROM registrations_licenses rl LEFT JOIN companies co ON rl.company_id = co.id
             WHERE ${where} ORDER BY rl.expiry_date ASC LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );
        const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM registrations_licenses rl WHERE ${where}`, params);
        res.json({ success: true, data: rows, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
    } catch (error) {
        console.error('Get registrations error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch registrations' });
    }
};

const createRegistration = async (req, res) => {
    try {
        const { company_id, document_type, document_number, issuing_authority, issue_date, expiry_date, file_url, alert_days_before } = req.body;
        const [result] = await pool.query(
            `INSERT INTO registrations_licenses (company_id, document_type, document_number, issuing_authority, issue_date, expiry_date, file_url, alert_days_before)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [company_id, document_type, document_number, issuing_authority, issue_date, expiry_date, file_url, alert_days_before || 30]
        );
        const [rows] = await pool.query('SELECT * FROM registrations_licenses WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Create registration error:', error);
        res.status(500).json({ success: false, message: 'Failed to create registration' });
    }
};

const updateRegistration = async (req, res) => {
    try {
        const { company_id, document_type, document_number, issuing_authority, issue_date, expiry_date, status, file_url, alert_days_before } = req.body;
        await pool.query(
            `UPDATE registrations_licenses SET company_id=?, document_type=?, document_number=?, issuing_authority=?, issue_date=?, expiry_date=?, status=?, file_url=?, alert_days_before=? WHERE id=?`,
            [company_id, document_type, document_number, issuing_authority, issue_date, expiry_date, status, file_url, alert_days_before, req.params.id]
        );
        const [rows] = await pool.query('SELECT * FROM registrations_licenses WHERE id = ?', [req.params.id]);
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Update registration error:', error);
        res.status(500).json({ success: false, message: 'Failed to update registration' });
    }
};

const deleteRegistration = async (req, res) => {
    try {
        await pool.query('DELETE FROM registrations_licenses WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Registration deleted' });
    } catch (error) {
        console.error('Delete registration error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete registration' });
    }
};

const getExpiringItems = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const [rows] = await pool.query(
            `SELECT rl.*, co.name as company_name,
                    DATEDIFF(rl.expiry_date, CURDATE()) as days_remaining
             FROM registrations_licenses rl
             LEFT JOIN companies co ON rl.company_id = co.id
             WHERE rl.expiry_date IS NOT NULL AND rl.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY) AND rl.status != 'expired'
             ORDER BY rl.expiry_date ASC`,
            [parseInt(days)]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Get expiring items error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch expiring items' });
    }
};

const getInsurance = async (req, res) => {
    try {
        const { page = 1, limit = 20, search, company_id } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        let where = '1=1';
        const params = [];
        if (company_id) {
            where += ' AND bi.company_id = ?';
            params.push(company_id);
        }
        if (search) {
            where += ' AND (c.name LIKE ? OR bi.insurance_company LIKE ? OR bi.policy_number LIKE ? OR bi.broker_name LIKE ?)';
            const s = `%${search}%`;
            params.push(s, s, s, s);
        }
        const [rows] = await pool.query(
            `SELECT bi.*, c.name as company_name
             FROM business_insurance bi
             LEFT JOIN companies c ON bi.company_id = c.id
             WHERE ${where}
             ORDER BY bi.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, parseInt(limit, 10), offset]
        );
        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM business_insurance bi
             LEFT JOIN companies c ON bi.company_id = c.id
             WHERE ${where}`,
            params
        );
        res.json({
            success: true,
            message: 'Success',
            data: rows,
            pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total }
        });
    } catch (error) {
        console.error('Get insurance error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch insurance' });
    }
};

const createInsurance = async (req, res) => {
    try {
        const {
            company_id, insurance_company, broker_name, policy_type, policy_number, sum_insured,
            policy_commencement_date, renewal_date, start_from, expiry_date, amount_paid, mode_of_payment,
            asset_insured, payment_date, key_terms, alert_user, alert_before, remarks
        } = req.body;
        const [result] = await pool.query(
            `INSERT INTO business_insurance
            (company_id, insurance_company, broker_name, policy_type, policy_number, sum_insured, policy_commencement_date, renewal_date, start_from, expiry_date, amount_paid, mode_of_payment, asset_insured, payment_date, key_terms, alert_user, alert_before, remarks)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [company_id, insurance_company, broker_name, policy_type, policy_number, sum_insured, policy_commencement_date, renewal_date, start_from, expiry_date, amount_paid, mode_of_payment, asset_insured, payment_date, key_terms, alert_user, alert_before, remarks]
        );
        const [rows] = await pool.query('SELECT * FROM business_insurance WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, message: 'Success', data: rows[0] });
    } catch (error) {
        console.error('Create insurance error:', error);
        res.status(500).json({ success: false, message: 'Failed to create insurance' });
    }
};

const updateInsurance = async (req, res) => {
    try {
        const {
            company_id, insurance_company, broker_name, policy_type, policy_number, sum_insured,
            policy_commencement_date, renewal_date, start_from, expiry_date, amount_paid, mode_of_payment,
            asset_insured, payment_date, key_terms, alert_user, alert_before, remarks
        } = req.body;
        await pool.query(
            `UPDATE business_insurance SET company_id=?, insurance_company=?, broker_name=?, policy_type=?, policy_number=?, sum_insured=?, policy_commencement_date=?, renewal_date=?, start_from=?, expiry_date=?, amount_paid=?, mode_of_payment=?, asset_insured=?, payment_date=?, key_terms=?, alert_user=?, alert_before=?, remarks=? WHERE id=?`,
            [company_id, insurance_company, broker_name, policy_type, policy_number, sum_insured, policy_commencement_date, renewal_date, start_from, expiry_date, amount_paid, mode_of_payment, asset_insured, payment_date, key_terms, alert_user, alert_before, remarks, req.params.id]
        );
        const [rows] = await pool.query('SELECT * FROM business_insurance WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Success', data: rows[0] });
    } catch (error) {
        console.error('Update insurance error:', error);
        res.status(500).json({ success: false, message: 'Failed to update insurance' });
    }
};

const deleteInsurance = async (req, res) => {
    try {
        await pool.query('DELETE FROM business_insurance WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Success', data: [] });
    } catch (error) {
        console.error('Delete insurance error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete insurance' });
    }
};

const uploadInsurance = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'file is required' });
        await pool.query('UPDATE business_insurance SET file_url = ? WHERE id = ?', [`/uploads/business/${req.file.filename}`, req.params.id]);
        const [rows] = await pool.query('SELECT * FROM business_insurance WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Success', data: rows[0] });
    } catch (error) {
        console.error('Upload insurance error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload insurance file' });
    }
};

const getContracts = async (req, res) => {
    try {
        const { page = 1, limit = 20, search, company_id } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        let where = '1=1';
        const params = [];
        if (company_id) {
            where += ' AND bc.company_id = ?';
            params.push(company_id);
        }
        if (search) {
            where += ' AND (c.name LIKE ? OR bc.contract_name LIKE ? OR bc.name_of_party LIKE ? OR bc.category LIKE ?)';
            const s = `%${search}%`;
            params.push(s, s, s, s);
        }
        const [rows] = await pool.query(
            `SELECT bc.*, c.name as company_name
             FROM business_contracts bc
             LEFT JOIN companies c ON bc.company_id = c.id
             WHERE ${where}
             ORDER BY bc.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, parseInt(limit, 10), offset]
        );
        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM business_contracts bc
             LEFT JOIN companies c ON bc.company_id = c.id
             WHERE ${where}`,
            params
        );
        res.json({
            success: true,
            message: 'Success',
            data: rows,
            pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total }
        });
    } catch (error) {
        console.error('Get contracts error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch contracts' });
    }
};

const createContract = async (req, res) => {
    try {
        const {
            company_id, category, contract_name, contract_value, contract_period, name_of_party,
            date_of_execution, start_from, expiry_date, key_terms, alert_user, alert_before, remarks
        } = req.body;
        const [result] = await pool.query(
            `INSERT INTO business_contracts
            (company_id, category, contract_name, contract_value, contract_period, name_of_party, date_of_execution, start_from, expiry_date, key_terms, alert_user, alert_before, remarks)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [company_id, category, contract_name, contract_value, contract_period, name_of_party, date_of_execution, start_from, expiry_date, key_terms, alert_user, alert_before, remarks]
        );
        const [rows] = await pool.query('SELECT * FROM business_contracts WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, message: 'Success', data: rows[0] });
    } catch (error) {
        console.error('Create contract error:', error);
        res.status(500).json({ success: false, message: 'Failed to create contract' });
    }
};

const updateContract = async (req, res) => {
    try {
        const {
            company_id, category, contract_name, contract_value, contract_period, name_of_party,
            date_of_execution, start_from, expiry_date, key_terms, alert_user, alert_before, remarks
        } = req.body;
        await pool.query(
            `UPDATE business_contracts SET company_id=?, category=?, contract_name=?, contract_value=?, contract_period=?, name_of_party=?, date_of_execution=?, start_from=?, expiry_date=?, key_terms=?, alert_user=?, alert_before=?, remarks=? WHERE id=?`,
            [company_id, category, contract_name, contract_value, contract_period, name_of_party, date_of_execution, start_from, expiry_date, key_terms, alert_user, alert_before, remarks, req.params.id]
        );
        const [rows] = await pool.query('SELECT * FROM business_contracts WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Success', data: rows[0] });
    } catch (error) {
        console.error('Update contract error:', error);
        res.status(500).json({ success: false, message: 'Failed to update contract' });
    }
};

const deleteContract = async (req, res) => {
    try {
        await pool.query('DELETE FROM business_contracts WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Success', data: [] });
    } catch (error) {
        console.error('Delete contract error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete contract' });
    }
};

const uploadContract = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'file is required' });
        await pool.query('UPDATE business_contracts SET file_url = ? WHERE id = ?', [`/uploads/business/${req.file.filename}`, req.params.id]);
        const [rows] = await pool.query('SELECT * FROM business_contracts WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Success', data: rows[0] });
    } catch (error) {
        console.error('Upload contract error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload contract file' });
    }
};

// Aliases for UI naming
const getLicenses = getRegistrations;
const createLicense = createRegistration;
const updateLicense = updateRegistration;
const deleteLicense = deleteRegistration;

module.exports = {
    getRegistrations, createRegistration, updateRegistration, deleteRegistration, getExpiringItems,
    getInsurance, createInsurance, updateInsurance, deleteInsurance, uploadInsurance,
    getContracts, createContract, updateContract, deleteContract, uploadContract,
    getLicenses, createLicense, updateLicense, deleteLicense
};
