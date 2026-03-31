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
CREATE TABLE IF NOT EXISTS leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    company_name VARCHAR(255),
    status VARCHAR(100),
    owner_id INT,
    source VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    country VARCHAR(100),
    phone VARCHAR(20),
    website VARCHAR(255),
    gstin VARCHAR(20),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS salary_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    salary_in_hand DECIMAL(12,2),
    overtime_per_day DECIMAL(10,2),
    leave_deduction DECIMAL(10,2),
    paid_leave INT DEFAULT 0,
    financial_year VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS business_insurance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT,
    insurance_company VARCHAR(255),
    broker_name VARCHAR(255),
    policy_type VARCHAR(100),
    policy_number VARCHAR(100),
    sum_insured DECIMAL(15,2),
    policy_commencement_date DATE,
    renewal_date DATE,
    start_from DATE,
    expiry_date DATE,
    amount_paid DECIMAL(15,2),
    mode_of_payment VARCHAR(100),
    asset_insured VARCHAR(255),
    payment_date DATE,
    key_terms TEXT,
    alert_user VARCHAR(255),
    alert_before VARCHAR(50),
    remarks TEXT,
    file_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS business_contracts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT,
    category VARCHAR(100),
    contract_name VARCHAR(255),
    contract_value DECIMAL(15,2),
    contract_period VARCHAR(100),
    name_of_party VARCHAR(255),
    date_of_execution DATE,
    start_from DATE,
    expiry_date DATE,
    key_terms TEXT,
    alert_user VARCHAR(255),
    alert_before VARCHAR(50),
    remarks TEXT,
    file_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS checklists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS checklist_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    checklist_id INT NOT NULL,
    sr_no INT,
    particular VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (checklist_id) REFERENCES checklists(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS checklist_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    checklist_id INT NOT NULL,
    maker_id INT NOT NULL,
    checker_id INT NOT NULL,
    due_date DATE,
    status ENUM('pending','in_progress','completed','cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (checklist_id) REFERENCES checklists(id) ON DELETE CASCADE,
    FOREIGN KEY (maker_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (checker_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS timesheets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    client_id INT NOT NULL,
    assignment_id INT NULL,
    task VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_date DATE,
    end_time TIME,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (assignment_id) REFERENCES checklist_assignments(id) ON DELETE SET NULL
);
