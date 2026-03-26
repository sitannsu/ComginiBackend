const express = require('express');
const router = express.Router();
const checklistController = require('../controllers/checklistController');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.use(authenticateToken);

router.get('/', checklistController.getChecklists);
router.post('/', checklistController.createChecklist);
router.delete('/:id', checklistController.deleteChecklist);
router.post('/import', upload.single('file'), checklistController.importChecklistExcel);

module.exports = router;
