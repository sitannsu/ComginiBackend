const express = require('express');
const router = express.Router();
const pc = require('../controllers/paymentsController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', pc.getPayments);
router.post('/', pc.createPayment);
router.put('/:id', pc.updatePayment);
router.delete('/:id', pc.deletePayment);

module.exports = router;
