const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function runMigrations() {
    const connection = await pool.getConnection();

    try {
        console.log('🚀 Starting database migrations...');

        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Remove comment lines, then split into individual statements
        const cleanedSchema = schema
            .split('\n')
            .filter(line => !line.trim().startsWith('--'))
            .join('\n');

        const statements = cleanedSchema
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            console.log('  Executing:', statement.substring(0, 60) + '...');
            await connection.query(statement);
        }

        console.log('✅ Database migrations completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        connection.release();
    }
}

runMigrations();
