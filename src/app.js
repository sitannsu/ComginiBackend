const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

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
const leadsRoutes = require('./routes/leadsRoutes');
const commonRoutes = require('./routes/commonRoutes');
const ac = require('./controllers/assignmentController');
const { generalLimiter } = require('./middleware/rateLimiter');

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
app.use(`${v1}/finance`, financeRoutes);
app.use(`${v1}/support`, supportRoutes);
app.use(`${v1}/secretarial`, secretarialRoutes);
app.use(`${v1}/mca`, mcaRoutes);
app.use(`${v1}/efiling`, efilingRoutes);
app.use(v1, entityRoutes);
app.use(v1, mastersExtraRoutes);
app.use(`${v1}/checklists`, checklistRoutes);
app.use(`${v1}/assignments`, assignmentRoutes);
app.use(`${v1}/timesheets`, timesheetRoutes);
app.use(`${v1}/leads`, leadsRoutes);
app.use(v1, commonRoutes);

// New requested routes
app.use('/api/forms', incorporationRoutes);
app.use('/api/company', mcaRoutes);
app.use('/api/checklists', checklistRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/timesheets', timesheetRoutes);

const { authenticateToken } = require('./middleware/auth');

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
