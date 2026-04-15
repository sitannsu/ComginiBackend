const express = require('express');
const router = express.Router();
const cc = require('../controllers/commerceController');

router.get('/', cc.getPlans);

module.exports = router;
