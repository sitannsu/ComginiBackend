const express = require('express');
const router = express.Router();
const cc = require('../controllers/commerceController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.post('/create-order', cc.createOrder);
router.post('/verify', cc.verifyPayment);
router.get('/history', cc.getPaymentHistory);

module.exports = router;
