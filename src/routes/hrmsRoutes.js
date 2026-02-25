const express = require('express');
const router = express.Router();
const hc = require('../controllers/hrmsController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Employees
router.get('/employees', hc.getEmployees);
router.get('/employees/:id', hc.getEmployeeById);
router.post('/employees', hc.createEmployee);
router.put('/employees/:id', hc.updateEmployee);

// Attendance
router.get('/attendance', hc.getAttendance);
router.post('/attendance/clock-in', hc.clockIn);
router.put('/attendance/clock-out', hc.clockOut);

// Leaves
router.get('/leaves', hc.getLeaves);
router.post('/leaves', hc.applyLeave);
router.put('/leaves/:id/approve', hc.approveLeave);

module.exports = router;
