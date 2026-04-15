-- Profile fields + subscription / Razorpay tables (frontend contract)
-- Run once if alter_migrations.sql was not applied: mysql ... < src/database/deploy_subscription_commerce.sql

ALTER TABLE users ADD COLUMN avatar VARCHAR(32) DEFAULT 'blue';
ALTER TABLE users ADD COLUMN gender VARCHAR(20) DEFAULT NULL;
ALTER TABLE users ADD COLUMN company_name VARCHAR(255) DEFAULT NULL;
ALTER TABLE users ADD COLUMN gst_number VARCHAR(32) DEFAULT NULL;
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    plan_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) DEFAULT 'active',
    expiry_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_subscription (user_id)
);
CREATE TABLE IF NOT EXISTS subscription_payment_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    plan_id VARCHAR(64) NOT NULL,
    razorpay_order_id VARCHAR(255) NOT NULL,
    amount_paise INT NOT NULL,
    currency VARCHAR(8) DEFAULT 'INR',
    status VARCHAR(32) DEFAULT 'created',
    razorpay_payment_id VARCHAR(255) NULL,
    verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_rzp_order (razorpay_order_id)
);
