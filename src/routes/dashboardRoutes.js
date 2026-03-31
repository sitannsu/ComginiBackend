const express = require('express');
const router = express.Router();
const dc = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Dashboard Summary
router.get('/summary', dc.getDashboardSummary);
router.get('/stats', dc.getDashboardStats);
router.get('/payments', dc.getDashboardPayments);
router.get('/income-expense', dc.getDashboardIncomeExpense);
router.get('/finance-breakdown', dc.getDashboardFinanceBreakdown);
router.get('/tasks', dc.getDashboardTasks);
router.get('/updates', dc.getDashboardUpdates);
router.get('/finance-overview', dc.getFinanceOverview);
router.get('/expense-breakdown', dc.getExpenseBreakdown);

// Widgets
router.get('/widgets', dc.getWidgets);
router.put('/widgets', dc.updateWidgets);

// Private Notes
router.get('/notes', dc.getNotes);
router.post('/notes', dc.createNote);
router.put('/notes/:id', dc.updateNote);
router.delete('/notes/:id', dc.deleteNote);

// Social Feed
router.get('/feed', dc.getFeed);
router.post('/feed', dc.createPost);
router.delete('/feed/:id', dc.deletePost);

module.exports = router;
