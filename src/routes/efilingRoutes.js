const express = require('express');
const router = express.Router();
const ec = require('../controllers/efilingController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', ec.getEformFilings);
router.get('/:id', ec.getEformFilingById);
router.post('/', ec.createEformFiling);
router.put('/:id', ec.updateEformFiling);
router.delete('/:id', ec.deleteEformFiling);

module.exports = router;
