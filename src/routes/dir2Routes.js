const express = require('express');
const router = express.Router();
const dc = require('../controllers/dir2ModuleController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);
router.get('/', dc.listDir2);
router.post('/', dc.createDir2);

module.exports = router;
