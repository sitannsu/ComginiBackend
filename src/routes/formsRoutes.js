const express = require('express');
const router = express.Router();
const fc = require('../controllers/formsModuleController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);
router.get('/', fc.listForms);

module.exports = router;
