/**
 * UI alias: Contract/Agreement module → same handlers as /api/v1/business/contracts
 */
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

router.get('/', bc.getContracts);
router.post('/', bc.createContract);
router.put('/:id', bc.updateContract);
router.delete('/:id', bc.deleteContract);
router.post('/:id/upload', upload.single('file'), bc.uploadContract);

module.exports = router;
