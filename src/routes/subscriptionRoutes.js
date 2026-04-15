const express = require('express');
const router = express.Router();
const cc = require('../controllers/commerceController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);
router.get('/current', cc.getCurrentSubscription);

module.exports = router;
