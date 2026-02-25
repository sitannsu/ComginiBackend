const express = require('express');
const router = express.Router();
const bc = require('../controllers/businessController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/registrations', bc.getRegistrations);
router.post('/registrations', bc.createRegistration);
router.put('/registrations/:id', bc.updateRegistration);
router.delete('/registrations/:id', bc.deleteRegistration);
router.get('/expiring', bc.getExpiringItems);

module.exports = router;
