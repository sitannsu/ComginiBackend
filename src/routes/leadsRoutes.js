const express = require('express');
const router = express.Router();
const lc = require('../controllers/leadsController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', lc.getLeads);
router.get('/kanban', lc.getKanban);
router.get('/sources', lc.getLeadSources);
router.get('/status', lc.getLeadStatus);
router.post('/', lc.createLead);
router.put('/:leadId', lc.updateLead);
router.delete('/:leadId', lc.deleteLead);

module.exports = router;
