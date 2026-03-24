const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const mxc = require('../controllers/mastersExtraController');
const mc = require('../controllers/mastersController');
const { authenticateToken } = require('../middleware/auth');

const uploadDir = path.join(process.cwd(), 'uploads', 'adt1');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `${Date.now()}-${safeName}`);
    }
});
const upload = multer({ storage });

router.use(authenticateToken);

// Auditor master
router.post('/auditors', mxc.createAuditor);
router.get('/auditors', mxc.getAuditors);
router.get('/auditors/company-wise', mxc.getCompanyWiseAuditors);
router.post('/auditors/adt1-upload', upload.fields([{ name: 'file_v2', maxCount: 1 }, { name: 'file_v3', maxCount: 1 }]), mxc.uploadAuditorAdt1);

// Client groups
router.post('/client-groups', mxc.createClientGroup);
router.get('/client-groups', mxc.getClientGroups);

// Companies dropdown / MCA
router.get('/companies', mc.getCompanies);
router.get('/companies/mca', mc.searchMCACompanies);
router.post('/companies', mc.createCompany);

// MIS report
router.post('/mis-report/generate', mxc.generateMisReport);
router.get('/mis-report/history', mxc.getMisReportHistory);

module.exports = router;
