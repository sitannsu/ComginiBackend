const bcrypt = require('bcryptjs');
const pool = require('../config/database');
require('dotenv').config();

async function createTestUser() {
    const client = await pool.getConnection();

    try {
        console.log('🚀 Creating test user...');

        const email = 'test@example.com';
        const password = 'Test123!@#';
        const firstName = 'Test';
        const lastName = 'User';

        // Check if user already exists
        const [existingRows] = await client.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingRows.length > 0) {
            console.log('⚠️  Test user already exists!');
            console.log('Email:', email);
            console.log('You can use this account to test the API.');
            return;
        }

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Insert test user
        const [result] = await client.query(
            `INSERT INTO users (email, password_hash, first_name, last_name, is_active, is_verified)
       VALUES (?, ?, ?, ?, true, true)`,
            [email, passwordHash, firstName, lastName]
        );

        const [userRows] = await client.query(
            'SELECT id, email, first_name, last_name FROM users WHERE id = ?',
            [result.insertId]
        );

        const user = userRows[0];

        console.log('✅ Test user created successfully!');
        console.log('\n📧 Login Credentials:');
        console.log('Email:', email);
        console.log('Password:', password);
        console.log('\n🔑 User Details:');
        console.log('ID:', user.id);
        console.log('Name:', `${user.first_name} ${user.last_name}`);
        console.log('\n💡 You can now use these credentials to test the login endpoint.');

    } catch (error) {
        console.error('❌ Error creating test user:', error);
    } finally {
        client.release();
        await pool.end();
        process.exit(0);
    }
}

createTestUser();
