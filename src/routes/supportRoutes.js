const express = require('express');
const router = express.Router();
const sc = require('../controllers/supportController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/tickets', sc.getTickets);
router.get('/tickets/:id', sc.getTicketById);
router.post('/tickets', sc.createTicket);
router.put('/tickets/:id', sc.updateTicket);

module.exports = router;
