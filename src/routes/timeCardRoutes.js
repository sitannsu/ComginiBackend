const express = require('express');
const router = express.Router();
const tc = require('../controllers/timeCardController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/summary', tc.getSummary);
router.get('/summary-details', tc.getSummaryDetails);
router.get('/user-report', tc.getUserReport);
router.get('/user-summary-details', tc.getUserSummaryDetails);
router.get('/members-logged', tc.getMembersLogged);
router.post('/log-in', tc.logIn);
router.post('/log-out', tc.logOut);
router.get('/', tc.getTimeCards);
router.post('/', tc.createTimeCard);
router.put('/:id', tc.updateTimeCard);
router.delete('/:id', tc.deleteTimeCard);

module.exports = router;
