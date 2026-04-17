const express = require('express');
const multer = require('multer');
const cc = require('../controllers/contractController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const uploadMem = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

router.use(authenticateToken);

router.get('/director', cc.listDirectorsContract);
router.post('/director', cc.createDirectorContract);
router.delete('/director/:id', cc.deleteDirectorContract);

router.get('/banker-pan', cc.listBankerPan);
router.post('/banker-pan', cc.createBankerPan);

router.get('/debenture', cc.listDebenture);
router.post('/debenture', cc.createDebenture);

router.post('/upload', uploadMem.single('file'), cc.uploadFile);

module.exports = router;
