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
// UI aliases
router.post('/leave', hc.applyLeave);
router.put('/leave/:id/action', hc.approveLeave);

// Salary
router.get('/salary', hc.getSalary);
router.post('/salary', hc.createSalary);
router.post('/salary/save', hc.saveSalary);
router.delete('/salary/:id', hc.deleteSalary);

module.exports = router;
