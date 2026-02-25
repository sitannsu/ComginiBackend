const express = require('express');
const router = express.Router();
const mc = require('../controllers/mastersController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Companies
router.get('/companies', mc.getCompanies);
router.get('/companies/:id', mc.getCompanyById);
router.post('/companies', mc.createCompany);
router.put('/companies/:id', mc.updateCompany);
router.delete('/companies/:id', mc.deleteCompany);

// Directors
router.get('/companies/:companyId/directors', mc.getDirectors);
router.post('/companies/:companyId/directors', mc.createDirector);
router.put('/directors/:id', mc.updateDirector);

// RTA Masters
router.get('/rta', mc.getRTAs);
router.post('/rta', mc.createRTA);
router.put('/rta/:id', mc.updateRTA);
router.delete('/rta/:id', mc.deleteRTA);
router.post('/rta/link', mc.linkCompanyRTA);

// PCS/CA Firms
router.get('/pcs-firms', mc.getPCSFirms);
router.post('/pcs-firms', mc.createPCSFirm);
router.put('/pcs-firms/:id', mc.updatePCSFirm);
router.delete('/pcs-firms/:id', mc.deletePCSFirm);

module.exports = router;
