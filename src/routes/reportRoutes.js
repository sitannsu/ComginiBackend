const express = require('express');
const router = express.Router();
const rc = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Reports
router.get('/mis', rc.getMISReport);
router.get('/client-profitability', rc.getClientProfitabilityReport);
router.get('/team-efficiency', rc.getTeamEfficiencyReport);

// Report Schedules
router.get('/schedules', rc.getReportSchedules);
router.post('/schedules', rc.createReportSchedule);
router.put('/schedules/:id', rc.updateReportSchedule);
router.delete('/schedules/:id', rc.deleteReportSchedule);

module.exports = router;
