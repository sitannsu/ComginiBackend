const express = require('express');
const router = express.Router();
const mc = require('../controllers/mcaController');
const mv2v3 = require('../controllers/mcaV2V3ModuleController');
const cc = require('../controllers/contractController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// MCA V2 (register specific paths before generic)
const v2 = express.Router();
v2.get('/transactions/export', mv2v3.exportTransactionsCsv);
v2.get('/transactions/srn/:srn', mv2v3.getSrnDetails);
v2.post('/transactions/fetch', mv2v3.fetchTransactions);
v2.get('/transactions', mv2v3.listTransactions);
v2.get('/users', mv2v3.listMcaUsers);

const v3 = express.Router();
v3.post('/accounts', mv2v3.createMcaV3Account);

router.use('/v2', v2);
router.use('/v3', v3);

// Contract endpoints
router.get('/users', mv2v3.listMcaUsersContract);
router.post('/send-otp', cc.sendMcaOtp);
router.post('/verify-otp', cc.verifyMcaOtp);

router.get('/downloads', mc.getDownloads);
router.post('/downloads', mc.requestDownload);
router.put('/downloads/:id', mc.updateDownloadStatus);
router.get('/search', mc.searchCompany);

module.exports = router;
