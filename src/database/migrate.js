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

        // Run alter migrations for existing tables
        console.log('🔧 Running alter migrations...');
        const alterPath = path.join(__dirname, 'alter_migrations.sql');
        if (fs.existsSync(alterPath)) {
            const alterSql = fs.readFileSync(alterPath, 'utf8');
            const alterStatements = alterSql
                .split('\n')
                .filter(line => !line.trim().startsWith('--'))
                .join('\n')
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0);
            for (const stmt of alterStatements) {
                try {
                    console.log('  Alter:', stmt.substring(0, 60) + '...');
                    await connection.query(stmt);
                } catch (e) {
                    console.log('  (skipped - may already exist):', e.message.substring(0, 80));
                }
            }
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
