const express = require('express');
const router = express.Router();
const lc = require('../controllers/leadsController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', lc.getLeads);
router.get('/kanban', lc.getKanban);
router.post('/', lc.createLead);
router.put('/:leadId', lc.updateLead);
router.delete('/:leadId', lc.deleteLead);

module.exports = router;
