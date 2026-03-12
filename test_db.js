const pool = require('./src/config/database');
pool.query('DESCRIBE invoices').then(res => { console.log(res[0]); process.exit() });
