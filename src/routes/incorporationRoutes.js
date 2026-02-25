const express = require('express');
const router = express.Router();
const ic = require('../controllers/incorporationController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', ic.getIncorporations);
router.get('/:id', ic.getIncorporationById);
router.post('/', ic.createIncorporation);
router.put('/:id', ic.updateIncorporation);
router.delete('/:id', ic.deleteIncorporation);

module.exports = router;
