const express = require('express');
const router = express.Router();
const af = require('../controllers/annualFilingController');
const dv = require('../controllers/directorsV1Controller');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/annual-filing', af.listAnnualFiling);
router.post('/annual-filing/status', af.postAnnualFilingStatus);
router.get('/directors', dv.listDirectors);
router.post('/directors', dv.createDirector);

module.exports = router;
