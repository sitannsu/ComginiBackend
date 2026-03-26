const express = require('express');
const router = express.Router();
const timesheetController = require('../controllers/timesheetController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', timesheetController.getTimesheets);
router.post('/', timesheetController.createTimesheet);
router.get('/summary', timesheetController.getTimesheetSummary);

module.exports = router;
