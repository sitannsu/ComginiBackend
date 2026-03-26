const express = require('express');
const router = express.Router();
const mc = require('../controllers/mcaController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/downloads', mc.getDownloads);
router.post('/downloads', mc.requestDownload);
router.put('/downloads/:id', mc.updateDownloadStatus);
router.get('/search', mc.searchCompany);

module.exports = router;
