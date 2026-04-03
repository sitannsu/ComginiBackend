const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const dc = require('../controllers/dir3KycModuleController');

router.use(authenticateToken);
router.get('/', dc.listDir3Kyc);

module.exports = router;
