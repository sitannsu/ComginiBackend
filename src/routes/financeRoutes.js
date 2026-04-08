const express = require('express');
const router = express.Router();
const fc = require('../controllers/financeController');
const paymentsRoutes = require('./paymentsRoutes');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Payments received (Finance module UI) — same as /api/v1/payments
router.use('/payments', paymentsRoutes);

// Income vs expenses (spec: chart, summary, monthly)
router.get('/chart', fc.getIncomeExpenseChart);
router.get('/summary', fc.getIncomeExpenseSummary);
router.get('/monthly', fc.getIncomeExpenseMonthly);

// Invoices
router.get('/invoices', fc.getInvoices);
router.get('/invoices/:id', fc.getInvoiceById);
router.post('/invoices', fc.createInvoice);
router.put('/invoices/:id', fc.updateInvoice);
router.delete('/invoices/:id', fc.deleteInvoice);

// Expenses
router.get('/expenses', fc.getExpenses);
router.post('/expenses', fc.createExpense);
router.put('/expenses/:id', fc.updateExpense);
router.delete('/expenses/:id', fc.deleteExpense);

// Profit/Loss
router.get('/profit-loss', fc.getProfitLoss);

module.exports = router;
