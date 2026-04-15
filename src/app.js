const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { authenticateToken } = require('./middleware/auth');
const { generalLimiter } = require('./middleware/rateLimiter');

const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const clientRoutes = require('./routes/clientRoutes');
const mastersRoutes = require('./routes/mastersRoutes');
const incorporationRoutes = require('./routes/incorporationRoutes');
const taskRoutes = require('./routes/taskRoutes');
const eventRoutes = require('./routes/eventRoutes');
const documentRoutes = require('./routes/documentRoutes');
const reportRoutes = require('./routes/reportRoutes');
const hrmsRoutes = require('./routes/hrmsRoutes');
const businessRoutes = require('./routes/businessRoutes');
const financeRoutes = require('./routes/financeRoutes');
const supportRoutes = require('./routes/supportRoutes');
const secretarialRoutes = require('./routes/secretarialRoutes');
const mcaRoutes = require('./routes/mcaRoutes');
const efilingRoutes = require('./routes/efilingRoutes');
const entityRoutes = require('./routes/entityRoutes');
const mastersExtraRoutes = require('./routes/mastersExtraRoutes');
const checklistRoutes = require('./routes/checklistRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const timesheetRoutes = require('./routes/timesheetRoutes');
const timeCardRoutes = require('./routes/timeCardRoutes');
const leadsRoutes = require('./routes/leadsRoutes');
const paymentsRoutes = require('./routes/paymentsRoutes');
const agreementsRoutes = require('./routes/agreementsRoutes');
const commonRoutes = require('./routes/commonRoutes');
const dir3KycRoutes = require('./routes/dir3KycRoutes');
const shareholdersRoutes = require('./routes/shareholdersRoutes');
const formsRoutes = require('./routes/formsRoutes');
const dir2Routes = require('./routes/dir2Routes');
const credentialsV1Routes = require('./routes/credentialsV1Routes');
const annualFilingDirectorsRoutes = require('./routes/annualFilingDirectorsRoutes');
const secretarialModuleController = require('./controllers/secretarialModuleController');
const dc = require('./controllers/dashboardController');
const ac = require('./controllers/assignmentController');
const userProfileRoutes = require('./routes/userProfileRoutes');
const plansRoutes = require('./routes/plansRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const paymentCommerceRoutes = require('./routes/paymentCommerceRoutes');
const aiChatRoutes = require('./routes/aiChatRoutes');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Apply general rate limiting to all routes
app.use(generalLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// API routes
const v1 = `/api/${process.env.API_VERSION || 'v1'}`;
app.use(`${v1}/auth`, authRoutes);
app.use('/api/auth', authRoutes);
app.use(`${v1}/dashboard`, dashboardRoutes);
app.use(`${v1}/clients`, clientRoutes);
app.use(`${v1}/masters`, mastersRoutes);
app.use(`${v1}/incorporations`, incorporationRoutes);
app.use(`${v1}/tasks`, taskRoutes);
app.use(`${v1}/events`, eventRoutes);
app.use(`${v1}/documents`, documentRoutes);
app.use(`${v1}/reports`, reportRoutes);
app.use(`${v1}/hrms`, hrmsRoutes);
app.use(`${v1}/business`, businessRoutes);
app.use(`${v1}/business-manager`, businessRoutes);
app.use(`${v1}/agreements`, agreementsRoutes);
app.use(`${v1}/finance`, financeRoutes);
app.use(`${v1}/support`, supportRoutes);
app.use(`${v1}/secretarial`, secretarialRoutes);
app.use(`${v1}/dir3-kyc`, dir3KycRoutes);
app.use(`${v1}/shareholders`, shareholdersRoutes);
app.use(`${v1}/mca`, mcaRoutes);
app.use(`${v1}/efiling`, efilingRoutes);
app.use(v1, entityRoutes);
app.use(v1, mastersExtraRoutes);
app.use(`${v1}/checklists`, checklistRoutes);
app.use(`${v1}/assignments`, assignmentRoutes);
app.use(`${v1}/timesheets`, timesheetRoutes);
app.use(`${v1}/time-cards`, timeCardRoutes);
app.use(`${v1}/leads`, leadsRoutes);
app.use(`${v1}/payments`, paymentsRoutes);
app.use(v1, commonRoutes);
app.use(`${v1}/forms`, formsRoutes);
app.use(`${v1}/dir2`, dir2Routes);
app.post(`${v1}/search-report`, authenticateToken, secretarialModuleController.createSearchReport);
app.use(v1, credentialsV1Routes);
app.use(v1, annualFilingDirectorsRoutes);

app.use(`${v1}/user`, userProfileRoutes);
app.use('/api/user', userProfileRoutes);
app.use(`${v1}/plans`, plansRoutes);
app.use('/api/plans', plansRoutes);
app.use(`${v1}/subscription`, subscriptionRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use(`${v1}/payment`, paymentCommerceRoutes);
app.use('/api/payment', paymentCommerceRoutes);
app.use(`${v1}/ai`, aiChatRoutes);
app.use('/api/ai', aiChatRoutes);

// Dashboard updates — frontend calls /api/v1/updates (alias for /api/v1/dashboard/updates)
app.get(`${v1}/updates`, authenticateToken, dc.getDashboardUpdates);

// New requested routes
app.get('/api/updates', authenticateToken, dc.getDashboardUpdates);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/hrms', hrmsRoutes);
app.use('/api/masters', mastersRoutes);
app.use('/api', mastersExtraRoutes);
app.use('/api/forms', incorporationRoutes);
app.use('/api/company', mcaRoutes);
app.use('/api/checklists', checklistRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/timesheets', timesheetRoutes);



// Dropdown APIs
app.get('/api/users', authenticateToken, ac.getUsers);
app.get('/api/companies', authenticateToken, ac.getCompanies);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

module.exports = app;
