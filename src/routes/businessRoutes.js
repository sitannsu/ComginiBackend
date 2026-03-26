const express = require('express');
const router = express.Router();
const bc = require('../controllers/businessController');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(process.cwd(), 'uploads', 'business');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

router.use(authenticateToken);

router.get('/registrations', bc.getRegistrations);
router.post('/registrations', bc.createRegistration);
router.put('/registrations/:id', bc.updateRegistration);
router.delete('/registrations/:id', bc.deleteRegistration);
router.get('/expiring', bc.getExpiringItems);

// UI aliases for licenses
router.get('/licenses', bc.getLicenses);
router.post('/licenses', bc.createLicense);
router.put('/licenses/:id', bc.updateLicense);
router.delete('/licenses/:id', bc.deleteLicense);

// Insurance
router.get('/insurance', bc.getInsurance);
router.post('/insurance', bc.createInsurance);
router.put('/insurance/:id', bc.updateInsurance);
router.delete('/insurance/:id', bc.deleteInsurance);
router.post('/insurance/:id/upload', upload.single('file'), bc.uploadInsurance);

// Contracts
router.get('/contracts', bc.getContracts);
router.post('/contracts', bc.createContract);
router.put('/contracts/:id', bc.updateContract);
router.delete('/contracts/:id', bc.deleteContract);
router.post('/contracts/:id/upload', upload.single('file'), bc.uploadContract);

module.exports = router;
