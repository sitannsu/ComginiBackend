-- One-shot: payments + time_cards (fixes 500 if tables missing)
-- mysql -u USER -p DB_NAME < src/database/deploy_modules_leads_finance_hr.sql

CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NULL,
    assignment_id INT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50),
    note TEXT,
    amount DECIMAL(12,2) NOT NULL,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS time_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    `mode` VARCHAR(10) NOT NULL DEFAULT 'WFO',
    in_date DATE NOT NULL,
    in_time TIME NOT NULL,
    out_date DATE NULL,
    out_time TIME NULL,
    note TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_open (user_id, in_date),
    INDEX idx_in_date (in_date)
);
