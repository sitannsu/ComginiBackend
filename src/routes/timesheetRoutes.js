const express = require('express');
const router = express.Router();
const timesheetController = require('../controllers/timesheetController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/summary', timesheetController.getTimesheetSummary);
router.put('/:id', timesheetController.updateTimesheet);
router.delete('/:id', timesheetController.deleteTimesheet);
router.get('/', timesheetController.getTimesheets);
router.post('/', timesheetController.createTimesheet);

module.exports = router;
