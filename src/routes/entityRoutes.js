const express = require('express');
const router = express.Router();
const mc = require('../controllers/mastersController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Company APIs (frontend alias routes)
router.get('/companies/mca', mc.searchMCACompanies);
router.post('/companies', mc.createCompany);

// Shareholder Master
router.post('/shareholders', mc.createShareholder);
router.get('/shareholders', mc.getShareholders);

// Debenture Holder Master
router.post('/debenture-holders', mc.createDebentureHolder);
router.get('/debenture-holders', mc.getDebentureHolders);

module.exports = router;
