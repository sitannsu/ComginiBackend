-- Secretarial Practice API module (search reports, CSR, DIR3, MCA, tenure, etc.)
-- Run after main schema if these tables are missing.

CREATE TABLE IF NOT EXISTS secretarial_search_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entity_type ENUM('company','llp') DEFAULT 'company',
    payload JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS secretarial_csr_calculations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    financial_year VARCHAR(20) NOT NULL,
    computation_data JSON NOT NULL,
    csr_spent DECIMAL(18,2) DEFAULT 0,
    excess_carry_forward DECIMAL(18,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS secretarial_dir3_kyc (
    id INT AUTO_INCREMENT PRIMARY KEY,
    din VARCHAR(20) NOT NULL,
    pan VARCHAR(20),
    is_kyc_done BOOLEAN DEFAULT FALSE,
    status VARCHAR(100),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS secretarial_mca_credentials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    target_id INT NOT NULL,
    target_type ENUM('company','director','llp') NOT NULL,
    user_id VARCHAR(255),
    password VARCHAR(255),
    v3_user_id VARCHAR(255),
    v3_password VARCHAR(255),
    last_updated DATE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_mca_cred (target_id, target_type)
);

CREATE TABLE IF NOT EXISTS secretarial_mca_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT,
    srn VARCHAR(80),
    description TEXT,
    amount DECIMAL(18,2),
    status VARCHAR(80),
    receipt_url VARCHAR(500),
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS secretarial_tenure_tracker (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT,
    label VARCHAR(255),
    start_date DATE,
    end_date DATE,
    duration INT,
    status VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS secretarial_compliance_reminders_ext (
    id INT AUTO_INCREMENT PRIMARY KEY,
    compliance_id INT,
    company_id INT NOT NULL,
    reminder_date DATE NOT NULL,
    reminder_slot VARCHAR(80),
    emails JSON,
    subject VARCHAR(500),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
