const express = require('express');
const router = express.Router();
const tc = require('../controllers/taskController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Tasks
router.get('/', tc.getTasks);
router.get('/:id', tc.getTaskById);
router.post('/', tc.createTask);
router.patch('/:id/star', tc.toggleTaskStar);
router.put('/:id', tc.updateTask);
router.delete('/:id', tc.deleteTask);

// Task Comments
router.post('/:taskId/comments', tc.addComment);

// Task Time Logs
router.post('/:taskId/timer/start', tc.startTimer);
router.put('/timer/:logId/stop', tc.stopTimer);

// Call Logs
router.get('/call-logs/list', tc.getCallLogs);
router.post('/call-logs', tc.createCallLog);

// Timesheets
router.get('/timesheets/report', tc.getTimesheets);

module.exports = router;
