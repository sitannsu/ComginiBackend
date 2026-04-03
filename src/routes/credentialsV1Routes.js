const express = require('express');
const multer = require('multer');
const router = express.Router();
const cm = require('../controllers/credentialsMcaController');
const bs = require('../controllers/bulkSendController');
const { authenticateToken } = require('../middleware/auth');

const uploadMem = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

router.use(authenticateToken);

router.get('/llp/credentials', cm.listLlpCredentials);
router.post('/llp/credentials', cm.createLlpCredentials);
router.get('/company/credentials/export', cm.exportCompanyCredentialsCsv);
router.get('/company/credentials', cm.listCompanyCredentials);
router.post('/company/credentials', cm.createCompanyCredentials);

router.post('/bulk/whatsapp/upload', uploadMem.single('file'), bs.uploadWhatsAppContacts);
router.post('/bulk/whatsapp/send', bs.sendBulkWhatsapp);
router.post('/bulk/gmail/send', bs.sendBulkGmail);
router.get('/bulk/whatsapp/campaigns', bs.listWhatsappCampaigns);
router.get('/bulk/gmail/campaigns', bs.listGmailCampaigns);

module.exports = router;
