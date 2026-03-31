const nodemailer = require('nodemailer');
require('dotenv').config();

function hasSmtpCredentials() {
    return Boolean(
        process.env.EMAIL_HOST &&
        String(process.env.EMAIL_USER || '').trim() &&
        String(process.env.EMAIL_PASSWORD || '').trim()
    );
}

let transporter = null;

if (hasSmtpCredentials()) {
    transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    transporter.verify((error) => {
        if (error) {
            console.error('❌ Email configuration error:', error.message);
        } else {
            console.log('✅ Email server is ready to send messages');
        }
    });
} else {
    console.log('ℹ️ Email not configured (set EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD) — outbound mail disabled until then');
}

module.exports = transporter;
