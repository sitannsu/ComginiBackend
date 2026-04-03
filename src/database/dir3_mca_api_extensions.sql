-- DIR-3 KYC list + MCA V2/V3 API extensions
-- Run after main schema and secretarial_module_tables.sql

-- Optional (run once; ignore error if column already exists):
-- ALTER TABLE secretarial_dir3_kyc ADD COLUMN assigned_user_id INT NULL;
-- ALTER TABLE secretarial_dir3_kyc ADD CONSTRAINT fk_dir3_assigned_user FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS mca_v2_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mca_user_id VARCHAR(100),
    status VARCHAR(50),
    due_date DATE,
    transaction_date DATE,
    payment_date DATE,
    amount DECIMAL(18,2),
    srn VARCHAR(80),
    description TEXT,
    company_id INT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS mca_v3_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_category ENUM('REGISTERED','BUSINESS') NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    pan VARCHAR(20),
    dob DATE,
    address TEXT,
    email VARCHAR(255),
    mobile VARCHAR(20),
    username VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_mca_v3_username (username),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
