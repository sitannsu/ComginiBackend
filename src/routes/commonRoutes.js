const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const cc = require('../controllers/commonController');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

const uploadDir = path.join(process.cwd(), 'uploads', 'common');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

router.use(authenticateToken);

router.get('/users', cc.getUsers);
router.get('/update-profile', authController.getProfile);
router.get('/masters/status', cc.getMasterStatus);
router.get('/masters/sources', cc.getMasterSources);
router.post('/upload', upload.single('file'), cc.uploadFile);

module.exports = router;
