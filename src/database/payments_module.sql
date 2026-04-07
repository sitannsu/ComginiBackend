-- Payments ledger (API spec: GET/POST/PUT/DELETE /api/v1/payments)
-- Run once on existing DBs: mysql ... < src/database/payments_module.sql

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
