const express = require('express');
const router = express.Router();
const sc = require('../controllers/secretarialController');
const sm = require('../controllers/secretarialModuleController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// ---- Secretarial Practice API (spec) — register specific paths first ----
router.get('/search-reports', sm.listSearchReports);
router.post('/search-reports', sm.createSearchReport);

router.get('/csr-calculations', sm.listCSRCalculations);
router.post('/csr-calculations', sm.createCSRCalculation);

router.post('/dir3-kyc', sm.submitDIR3KYC);

router.post('/mca-credentials', sm.upsertMCACredentials);
router.patch('/mca-credentials', sm.upsertMCACredentials);

router.patch('/compliances/bulk-update', sm.bulkUpdateCompliances);
router.post('/compliances/reminders', sm.setComplianceReminder);

router.get('/mca-transactions', sm.listMCATransactions);
router.post('/mca-transactions/sync', sm.syncMCATransaction);

router.get('/tenure-tracker', sm.listTenureTracker);
router.post('/tenure-tracker', sm.createTenureTracker);
router.patch('/tenure-tracker/:id', sm.updateTenureTracker);

// DSC (spec-aligned routes before generic :id)
router.post('/dsc/boxes', sm.createDSCBoxSpec);
router.patch('/dsc/:id/status', sm.patchDSCStatusSpec);
router.get('/dsc', sm.listDSCRecordsSpec);
router.post('/dsc', sc.createDSCToken);
router.put('/dsc/:id', sc.updateDSCToken);
router.put('/dsc/:id/toggle', sc.toggleDSCStatus);

// DSC Boxes (legacy paths)
router.get('/dsc-boxes', sc.getDSCBoxes);
router.post('/dsc-boxes', sc.createDSCBox);

// Filing Status
router.get('/filings', sc.getFilingStatus);
router.post('/filings', sc.createFilingStatus);
router.put('/filings/:id', sc.updateFilingStatus);
router.put('/filings/bulk-update', sc.bulkUpdateFilingStatus);

// Compliance Reminders (legacy)
router.get('/reminders', sc.getReminders);
router.post('/reminders', sc.createReminder);
router.delete('/reminders/:id', sc.deleteReminder);

// Director Tenure Tracker (legacy MCA-style list)
router.get('/director-tenures', sc.getDirectorTenures);

module.exports = router;
