-- Alter migrations for existing tables that need new columns
-- Each statement is wrapped in try/catch in migrate.js so duplicates are safely skipped

ALTER TABLE users ADD COLUMN role ENUM('admin','manager','employee','hr','finance') DEFAULT 'employee' AFTER phone
ALTER TABLE companies ADD COLUMN phone VARCHAR(20) AFTER email;
ALTER TABLE incorporations ADD COLUMN purpose VARCHAR(255) AFTER proposed_name_2;
ALTER TABLE tasks ADD COLUMN is_starred BOOLEAN DEFAULT false AFTER status;
ALTER TABLE tasks ADD COLUMN collaborators JSON AFTER is_starred;
ALTER TABLE tasks ADD COLUMN approver INT AFTER collaborators;
ALTER TABLE tasks ADD COLUMN labels JSON AFTER approver;
ALTER TABLE tasks ADD COLUMN start_date DATE AFTER labels;
ALTER TABLE tasks ADD COLUMN recurring BOOLEAN DEFAULT false AFTER start_date;
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_approver FOREIGN KEY (approver) REFERENCES users(id) ON DELETE SET NULL;
CREATE TABLE IF NOT EXISTS shareholders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NULL,
    full_name VARCHAR(255) NOT NULL,
    father_name VARCHAR(255),
    category VARCHAR(100),
    sub_category VARCHAR(100),
    under_sub_category VARCHAR(100),
    cin_llpin VARCHAR(100),
    registration_no VARCHAR(100),
    incorporation_date DATE,
    pan VARCHAR(20),
    email VARCHAR(255),
    mobile VARCHAR(20),
    address_line1 TEXT,
    country VARCHAR(100),
    state VARCHAR(100),
    city VARCHAR(100),
    pincode VARCHAR(20),
    aadhaar VARCHAR(20),
    nationality VARCHAR(100),
    marital_status VARCHAR(50),
    spouse_name VARCHAR(255),
    occupation VARCHAR(100),
    guardian_name VARCHAR(255),
    documents JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS debenture_holders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NULL,
    full_name VARCHAR(255) NOT NULL,
    father_name VARCHAR(255),
    category VARCHAR(100),
    sub_category VARCHAR(100),
    under_sub_category VARCHAR(100),
    address_line1 TEXT,
    country VARCHAR(100),
    state VARCHAR(100),
    city VARCHAR(100),
    pincode VARCHAR(20),
    gender VARCHAR(20),
    pan VARCHAR(20),
    dob DATE,
    aadhaar VARCHAR(20),
    nationality VARCHAR(100),
    voter_id VARCHAR(50),
    email VARCHAR(255),
    mobile VARCHAR(20),
    marital_status VARCHAR(50),
    spouse_name VARCHAR(255),
    occupation VARCHAR(100),
    guardian_name VARCHAR(255),
    cin_registration_no VARCHAR(100),
    incorporation_date DATE,
    documents JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS auditors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NULL,
    category ENUM('statutory','secretarial','cost','internal') NOT NULL,
    firm_registration_number VARCHAR(100),
    firm_name VARCHAR(255),
    pan VARCHAR(20),
    firm_email VARCHAR(255),
    address TEXT,
    country VARCHAR(100),
    state VARCHAR(100),
    city VARCHAR(100),
    membership_number VARCHAR(100),
    auditor_name VARCHAR(255),
    mobile VARCHAR(20),
    email VARCHAR(255),
    designation VARCHAR(100),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS auditor_adt1_uploads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    auditor_id INT NULL,
    file_v2_name VARCHAR(255),
    file_v2_url VARCHAR(500),
    file_v3_name VARCHAR(255),
    file_v3_url VARCHAR(500),
    uploaded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (auditor_id) REFERENCES auditors(id) ON DELETE SET NULL,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS client_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    contact_no VARCHAR(20),
    email VARCHAR(255),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS mis_report_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NULL,
    mis_date DATE,
    type ENUM('company','llp') DEFAULT 'company',
    generated_by INT,
    origin VARCHAR(100) DEFAULT 'manual',
    export_link VARCHAR(500),
    generated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
);
