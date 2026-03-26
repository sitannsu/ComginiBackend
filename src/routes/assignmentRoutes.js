const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', assignmentController.getAssignments);
router.post('/', assignmentController.createAssignment);

// Dropdown APIs
router.get('/users', assignmentController.getUsers);
router.get('/companies', assignmentController.getCompanies);

module.exports = router;
