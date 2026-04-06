-- =============================================================================
-- Comgini — Secretarial / Masters extensions (run once on MySQL)
-- Prerequisites: main schema applied (companies, clients, users exist)
-- Usage:
--   mysql -u YOUR_USER -p YOUR_DATABASE < src/database/deploy_secretarial_migrations.sql
-- =============================================================================

-- --- 1) DIR-3 / MCA V2 & V3 (dir3_mca_api_extensions.sql) ---
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

-- --- 2) LLP / Company credentials + bulk campaigns (credentials_and_bulk_campaigns.sql) ---
CREATE TABLE IF NOT EXISTS secretarial_llp_mca_credentials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    llpin VARCHAR(50) NOT NULL,
    llp_name VARCHAR(500),
    user_id VARCHAR(255),
    password VARCHAR(500),
    pan VARCHAR(20),
    email VARCHAR(255),
    contact_no VARCHAR(50),
    partner_mail_id VARCHAR(255),
    partner_name_for_otp VARCHAR(255),
    partner_ph_no VARCHAR(50),
    hint_question VARCHAR(500),
    hint_answer VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_llp_mca_llpin (llpin)
);

CREATE TABLE IF NOT EXISTS secretarial_company_mca_credentials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cin VARCHAR(50) NOT NULL,
    company_name VARCHAR(500),
    user_id VARCHAR(255),
    password VARCHAR(500),
    pan VARCHAR(20),
    email VARCHAR(255),
    contact_no VARCHAR(50),
    director_name_for_otp VARCHAR(255),
    director_mail_id VARCHAR(255),
    director_ph_no VARCHAR(50),
    hint_question VARCHAR(500),
    hint_answer VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_company_mca_cin (cin)
);

CREATE TABLE IF NOT EXISTS bulk_whatsapp_campaigns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    message TEXT,
    contacts_json JSON NOT NULL,
    sent_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    attachment_path VARCHAR(500),
    status VARCHAR(50) DEFAULT 'queued',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bulk_gmail_campaigns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    subject VARCHAR(500),
    body TEXT,
    emails_json JSON NOT NULL,
    sent_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    attachment_path VARCHAR(500),
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --- 3) Forms + DIR-2 (secretarial_forms_dir2.sql) ---
CREATE TABLE IF NOT EXISTS secretarial_forms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NULL,
    form_name VARCHAR(255) NOT NULL,
    team_member_name VARCHAR(255),
    start_date DATE,
    status VARCHAR(100),
    mca_user_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS secretarial_dir2 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NULL,
    company_name VARCHAR(500),
    appointee_name VARCHAR(255),
    din VARCHAR(20),
    pan VARCHAR(20),
    name VARCHAR(255),
    date_of_appointment DATE,
    dir2_status VARCHAR(100) DEFAULT 'draft',
    particulars JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

-- --- 4) Annual filing (annual_filing.sql) ---
CREATE TABLE IF NOT EXISTS secretarial_annual_filing_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NULL,
    client_name VARCHAR(500),
    cin VARCHAR(50),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_from VARCHAR(100) DEFAULT 'portal',
    metadata JSON,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS secretarial_annual_filing_status_checks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mca_user VARCHAR(255),
    company_id INT NULL,
    cin VARCHAR(50),
    result_json JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- Done. If secretarial_module_tables.sql was never applied, run it separately.
-- =============================================================================
