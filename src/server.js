const app = require('./app');
const pool = require('./config/database');

const PORT = process.env.PORT || 3000;

// Test database connection before starting server
pool.query('SELECT NOW()')
    .then(() => {
        console.log('✅ Database connection verified');

        // Start server
        const server = app.listen(PORT, () => {
            console.log(`🚀 Server is running on port ${PORT}`);
            console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔗 API Base URL: http://localhost:${PORT}/api/${process.env.API_VERSION || 'v1'}`);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('SIGTERM signal received: closing HTTP server');
            server.close(() => {
                console.log('HTTP server closed');
                pool.end().then(() => {
                    console.log('Database pool closed');
                    process.exit(0);
                });
            });
        });
    })
    .catch((err) => {
        console.error('❌ Failed to connect to database:', err);
        process.exit(1);
    });
