const express = require('express');
const router = express.Router();
const sc = require('../controllers/secretarialController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Filing Status
router.get('/filings', sc.getFilingStatus);
router.post('/filings', sc.createFilingStatus);
router.put('/filings/:id', sc.updateFilingStatus);
router.put('/filings/bulk-update', sc.bulkUpdateFilingStatus);

// Compliance Reminders
router.get('/reminders', sc.getReminders);
router.post('/reminders', sc.createReminder);
router.delete('/reminders/:id', sc.deleteReminder);

// DSC Management
router.get('/dsc', sc.getDSCTokens);
router.post('/dsc', sc.createDSCToken);
router.put('/dsc/:id', sc.updateDSCToken);
router.put('/dsc/:id/toggle', sc.toggleDSCStatus);

// DSC Boxes
router.get('/dsc-boxes', sc.getDSCBoxes);
router.post('/dsc-boxes', sc.createDSCBox);

// Director Tenure Tracker
router.get('/director-tenures', sc.getDirectorTenures);

module.exports = router;
