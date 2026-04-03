const express = require('express');
const router = express.Router();
const dc = require('../controllers/documentController');
const { authenticateToken } = require('../middleware/auth');

// Magic link upload (public - no auth needed)
router.post('/upload/:token', dc.uploadViaMagicLink);

router.use(authenticateToken);

router.get('/requested', dc.listRequestedDocuments);
router.get('/', dc.getDocuments);
router.post('/', dc.createDocument);
router.put('/:id', dc.updateDocument);
router.delete('/:id', dc.deleteDocument);

// Document Requests
router.get('/requests', dc.getDocumentRequests);
router.post('/requests', dc.createDocumentRequest);

module.exports = router;
