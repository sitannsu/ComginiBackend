const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const mc = require('../controllers/mastersController');
const { authenticateToken } = require('../middleware/auth');

const uploadDir = path.join(process.cwd(), 'uploads', 'shareholders');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
    dest: uploadDir,
    limits: { fileSize: 5 * 1024 * 1024 }
});

/** JSON body or multipart/form-data (optional PAN file: panDocument, pan, or file) */
function optionalShareholderUpload(req, res, next) {
    const ct = (req.headers['content-type'] || '').toLowerCase();
    if (ct.includes('multipart/form-data')) {
        return upload.fields([
            { name: 'panDocument', maxCount: 1 },
            { name: 'pan', maxCount: 1 },
            { name: 'file', maxCount: 1 }
        ])(req, res, next);
    }
    next();
}

router.use(authenticateToken);

/** Shareholder Master — /api/v1/shareholders */
router.get('/', mc.listShareholders);
router.post('/', optionalShareholderUpload, mc.createShareholder);
router.put('/:id', optionalShareholderUpload, mc.updateShareholder);
router.delete('/:id', mc.deleteShareholder);

module.exports = router;
