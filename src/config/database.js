const mysql = require('mysql2/promise');
require('dotenv').config();

const dbPassword =
  process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : process.env.MYSQL_PASSWORD;

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'comgini_db',
  user: process.env.DB_USER || 'root',
  password: dbPassword === '' ? '' : dbPassword,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  connectTimeout: 2000,
});

// Test database connection
pool.getConnection()
  .then((conn) => {
    console.log('✅ Database connected successfully');
    conn.release();
  })
  .catch((err) => {
    console.error('❌ Unexpected database error:', err);
    process.exit(-1);
  });

module.exports = pool;
